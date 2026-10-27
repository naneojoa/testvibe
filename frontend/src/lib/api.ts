export interface ApiErrorBody {
  code?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
  timestamp?: string;
  path?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fieldErrors: Record<string, string>;
  readonly requestId?: string;
  readonly timestamp?: string;
  readonly path?: string;

  constructor(status: number, body: ApiErrorBody = {}) {
    super(body.message ?? defaultMessage(status));
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors ?? {};
    this.requestId = body.requestId;
    this.timestamp = body.timestamp;
    this.path = body.path;
  }
}

interface RequestOptions {
  refreshOnUnauthorized?: boolean;
  redirectOnUnauthorized?: boolean;
  retryCsrfOnForbidden?: boolean;
}

let refreshPromise: Promise<boolean> | undefined;
let csrfPromise: Promise<CsrfData> | undefined;
let unauthorizedHandler: () => void = () => {};

interface CsrfData {
  token: string;
  headerName: string;
}

export function setUnauthorizedHandler(handler: () => void) {
  unauthorizedHandler = handler;
}

export function resetApiSecurityState() {
  refreshPromise = undefined;
  csrfPromise = undefined;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  let response: Response;
  try {
    const csrfHeaders = isUnsafeMethod(init.method) ? await getCsrfHeaders() : {};
    response = await fetch(path, {
      ...init,
      credentials: 'include',
      headers: { Accept: 'application/json', ...csrfHeaders, ...init.headers },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, {
      code: 'NETWORK_ERROR',
      message: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
    });
  }

  if (response.status === 401 && options.refreshOnUnauthorized !== false) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest(path, init, { ...options, refreshOnUnauthorized: false });
    }
    if (options.redirectOnUnauthorized !== false) unauthorizedHandler();
  }

  if (
    response.status === 403 &&
    isUnsafeMethod(init.method) &&
    options.retryCsrfOnForbidden !== false
  ) {
    csrfPromise = undefined;
    return apiRequest(path, init, { ...options, retryCsrfOnForbidden: false });
  }

  if (!response.ok) throw await toApiError(response);
  if (response.status === 204) return undefined as T;

  try {
    const body = (await response.json()) as { data?: T };
    if (!body || !Object.prototype.hasOwnProperty.call(body, 'data')) throw new Error();
    return body.data as T;
  } catch {
    throw new ApiError(502, {
      code: 'INVALID_RESPONSE',
      message: '서버 응답 형식이 올바르지 않습니다.',
    });
  }
}

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = getCsrfHeaders()
      .then((csrfHeaders) =>
        fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json', ...csrfHeaders },
        }),
      )
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = undefined;
      });
  }
  return refreshPromise;
}

export function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

async function getCsrfHeaders(): Promise<Record<string, string>> {
  if (!csrfPromise) {
    csrfPromise = fetch('/api/auth/csrf', {
      method: 'GET',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw await toApiError(response);
        const body = (await response.json()) as { data?: CsrfData };
        const cookieToken = readCookie('XSRF-TOKEN');
        if (!body.data?.headerName || !cookieToken) {
          throw new ApiError(502, {
            code: 'INVALID_RESPONSE',
            message: 'CSRF response or cookie is invalid',
          });
        }
        return { token: cookieToken, headerName: body.data.headerName };
      })
      .catch((error: unknown) => {
        csrfPromise = undefined;
        throw error;
      });
  }
  const csrf = await csrfPromise;
  return { [csrf.headerName]: csrf.token };
}

function readCookie(name: string): string | undefined {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie.split('; ').find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

function isUnsafeMethod(method?: string) {
  const normalized = (method ?? 'GET').toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(normalized);
}

async function toApiError(response: Response): Promise<ApiError> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('json')) {
    try {
      return new ApiError(response.status, (await response.json()) as ApiErrorBody);
    } catch {
      return new ApiError(response.status);
    }
  }
  return new ApiError(response.status);
}

function defaultMessage(status: number) {
  if (status === 0) return '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.';
  if (status === 401) return '로그인이 필요합니다.';
  if (status === 403) return '이 작업을 수행할 권한이 없습니다.';
  if (status === 404) return '요청한 정보를 찾을 수 없습니다.';
  if (status === 409) return '현재 상태에서는 요청을 처리할 수 없습니다.';
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

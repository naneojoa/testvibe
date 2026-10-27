import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiRequest, resetApiSecurityState } from './api';
import type { ApiError } from './api';

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => {
  resetApiSecurityState();
  document.cookie = 'XSRF-TOKEN=; Max-Age=0; Path=/';
  vi.unstubAllGlobals();
});

const csrfResponse = (token = 'masked-csrf-token') =>
  jsonResponse({ data: { token, headerName: 'X-XSRF-TOKEN' } });

describe('apiRequest', () => {
  it('unwraps the common data response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ data: { id: 'post-1' } })));
    await expect(apiRequest<{ id: string }>('/api/posts/post-1')).resolves.toEqual({
      id: 'post-1',
    });
  });

  it('normalizes JSON validation errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse(
          {
            code: 'VALIDATION_ERROR',
            message: 'Invalid',
            fieldErrors: { title: 'must not be blank' },
          },
          400,
        ),
      ),
    );
    await expect(apiRequest('/api/posts')).rejects.toMatchObject({
      status: 400,
      code: 'VALIDATION_ERROR',
      fieldErrors: { title: 'must not be blank' } satisfies ApiError['fieldErrors'],
    });
  });

  it('normalizes network failures', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiRequest('/api/posts')).rejects.toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
      message: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
    });
  });

  it('rejects a malformed success response as an API error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ unexpected: true })));
    await expect(apiRequest('/api/posts')).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  });

  it('handles successful empty responses', async () => {
    document.cookie = 'XSRF-TOKEN=cookie-csrf-token; Path=/';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(
      apiRequest<void>('/api/posts/post-1', { method: 'DELETE' }),
    ).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/posts/post-1',
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'cookie-csrf-token' }),
      }),
    );
  });

  it('refreshes once and retries a protected request', async () => {
    document.cookie = 'XSRF-TOKEN=cookie-csrf-token; Path=/';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 401 }))
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'user-1' } }))
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'post-1' } }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(apiRequest<{ id: string }>('/api/posts/post-1')).resolves.toEqual({
      id: 'post-1',
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/auth/refresh',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'cookie-csrf-token' }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('refreshes a stale CSRF token and retries an unsafe request once', async () => {
    document.cookie = 'XSRF-TOKEN=stale-cookie-token; Path=/';
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(csrfResponse())
      .mockResolvedValueOnce(jsonResponse({ code: 'FORBIDDEN' }, 403))
      .mockImplementationOnce(() => {
        document.cookie = 'XSRF-TOKEN=fresh-cookie-token; Path=/';
        return Promise.resolve(csrfResponse('fresh-masked-token'));
      })
      .mockResolvedValueOnce(jsonResponse({ data: null }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(apiRequest('/api/posts/post-1/like', { method: 'PUT' })).resolves.toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/posts/post-1/like',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-XSRF-TOKEN': 'fresh-cookie-token' }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('rejects an unsafe request when the CSRF cookie is missing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(csrfResponse()));

    await expect(apiRequest('/api/auth/sign-up', { method: 'POST' })).rejects.toMatchObject({
      status: 502,
      code: 'INVALID_RESPONSE',
    });
  });
});

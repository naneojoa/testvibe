import { ApiError } from './api';

export function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function toFieldErrors(error: unknown) {
  if (!(error instanceof ApiError)) return {};
  const defaults: Record<string, string> = {
    email: '올바른 이메일을 입력해 주세요.',
    password: '비밀번호는 8~72자로 입력해 주세요.',
    nickname: '닉네임은 2~50자로 입력해 주세요.',
    title: '제목은 1~200자로 입력해 주세요.',
    content: '내용을 1~10,000자로 입력해 주세요.',
    role: '올바른 권한을 선택해 주세요.',
  };
  return Object.fromEntries(
    Object.keys(error.fieldErrors).map((field) => [
      field,
      defaults[field] ?? error.fieldErrors[field],
    ]),
  );
}

export function errorMessage(error: unknown) {
  if (!(error instanceof ApiError)) return '예상하지 못한 오류가 발생했습니다.';
  const messages: Record<string, string> = {
    NETWORK_ERROR: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
    INVALID_RESPONSE: '서버 응답 형식이 올바르지 않습니다.',
    VALIDATION_ERROR: '입력한 내용을 다시 확인해 주세요.',
    INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
    INVALID_TOKEN: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
    EMAIL_EXISTS: '이미 사용 중인 이메일입니다.',
    NICKNAME_EXISTS: '이미 사용 중인 닉네임입니다.',
    ALREADY_LIKED: '이미 좋아요한 항목입니다.',
    LIKE_NOT_FOUND: '취소할 좋아요를 찾을 수 없습니다.',
    COMMENT_HAS_CHILDREN: '답글이 있는 댓글은 삭제할 수 없습니다.',
    PARENT_IMMUTABLE: '댓글의 답글 대상은 변경할 수 없습니다.',
    PARENT_POST_MISMATCH: '선택한 답글 대상이 현재 게시글에 속하지 않습니다.',
    SELF_ROLE_CHANGE: '자신의 관리자 권한은 변경할 수 없습니다.',
    SELF_DELETE: '자신의 관리자 계정은 삭제할 수 없습니다.',
    FORBIDDEN: '이 작업을 수행할 권한이 없습니다.',
    POST_NOT_FOUND: '게시글을 찾을 수 없습니다.',
    COMMENT_NOT_FOUND: '댓글을 찾을 수 없습니다.',
    USER_NOT_FOUND: '회원을 찾을 수 없습니다.',
  };
  if (error.code && messages[error.code]) return messages[error.code];
  const statusMessages: Record<number, string> = {
    0: '서버에 연결할 수 없습니다. 네트워크 상태를 확인해 주세요.',
    400: '요청한 내용을 다시 확인해 주세요.',
    401: '로그인이 필요합니다.',
    403: '이 작업을 수행할 권한이 없습니다.',
    404: '요청한 정보를 찾을 수 없습니다.',
    409: '현재 상태에서는 요청을 처리할 수 없습니다.',
    502: '서버 응답 형식이 올바르지 않습니다.',
  };
  const fallback =
    statusMessages[error.status] ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  return error.requestId ? `${fallback} 오류 번호: ${error.requestId}` : fallback;
}

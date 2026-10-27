export type FieldErrors = Record<string, string>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateCredentials(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = '올바른 이메일을 입력해 주세요.';
  if (password.length < 8 || password.length > 72) {
    errors.password = '비밀번호는 8~72자로 입력해 주세요.';
  }
  return errors;
}

export function validateNickname(nickname: string): FieldErrors {
  const length = nickname.trim().length;
  return length >= 2 && length <= 50 ? {} : { nickname: '닉네임은 2~50자로 입력해 주세요.' };
}

export function validatePost(title: string, content: string): FieldErrors {
  const errors: FieldErrors = {};
  const titleLength = title.trim().length;
  const contentLength = content.trim().length;
  if (titleLength < 1 || titleLength > 200) errors.title = '제목은 1~200자로 입력해 주세요.';
  if (contentLength < 1 || contentLength > 10_000) {
    errors.content = '내용은 1~10,000자로 입력해 주세요.';
  }
  return errors;
}

export function validateComment(content: string): FieldErrors {
  const length = content.trim().length;
  return length >= 1 && length <= 10_000 ? {} : { content: '댓글은 1~10,000자로 입력해 주세요.' };
}

export function validateSearchQuery(query: string): FieldErrors {
  return query.trim().length <= 200 ? {} : { q: '검색어는 200자 이하로 입력해 주세요.' };
}

export function clearFieldError(errors: FieldErrors, field: string): FieldErrors {
  if (!(field in errors)) return errors;
  const next = { ...errors };
  delete next[field];
  return next;
}

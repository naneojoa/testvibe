import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { errorMessage, toFieldErrors } from './format';

describe('API error presentation', () => {
  it('maps domain error codes to actionable Korean messages', () => {
    expect(errorMessage(new ApiError(409, { code: 'COMMENT_HAS_CHILDREN' }))).toBe(
      '답글이 있는 댓글은 삭제할 수 없습니다.',
    );
    expect(errorMessage(new ApiError(409, { code: 'ALREADY_LIKED' }))).toBe(
      '이미 좋아요한 항목입니다.',
    );
  });

  it('maps backend field errors to the shared validation wording', () => {
    const error = new ApiError(400, {
      code: 'VALIDATION_ERROR',
      fieldErrors: { title: 'must not be blank', nickname: 'size must be between 2 and 50' },
    });
    expect(toFieldErrors(error)).toEqual({
      title: '제목은 1~200자로 입력해 주세요.',
      nickname: '닉네임은 2~50자로 입력해 주세요.',
    });
  });

  it('does not expose arbitrary runtime error text', () => {
    expect(errorMessage(new Error('internal implementation detail'))).toBe(
      '예상하지 못한 오류가 발생했습니다.',
    );
    expect(errorMessage(new ApiError(500, { code: 'UNKNOWN', message: 'database detail' }))).toBe(
      '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.',
    );
    expect(
      errorMessage(
        new ApiError(500, {
          code: 'INTERNAL_ERROR',
          message: 'database detail',
          requestId: 'request-123',
        }),
      ),
    ).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요. 오류 번호: request-123');
  });
});

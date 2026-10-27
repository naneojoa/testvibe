import { describe, expect, it } from 'vitest';
import {
  clearFieldError,
  validateComment,
  validateCredentials,
  validateNickname,
  validatePost,
  validateSearchQuery,
} from './validation';

describe('input validation', () => {
  it('validates credentials using the backend password policy', () => {
    expect(validateCredentials('invalid', 'short')).toEqual({
      email: '올바른 이메일을 입력해 주세요.',
      password: '비밀번호는 8~72자로 입력해 주세요.',
    });
    expect(validateCredentials(' user@example.com ', 'password123')).toEqual({});
  });

  it('rejects blank and oversized post values after trimming', () => {
    expect(validatePost('   ', 'content')).toHaveProperty('title');
    expect(validatePost('title', 'x'.repeat(10_001))).toHaveProperty('content');
    expect(validatePost('title', 'content')).toEqual({});
  });

  it('matches nickname and comment limits', () => {
    expect(validateNickname('a')).toHaveProperty('nickname');
    expect(validateNickname(' 잇글 ')).toEqual({});
    expect(validateComment('   ')).toHaveProperty('content');
    expect(validateComment('좋은 글입니다.')).toEqual({});
  });

  it('clears only the field being edited', () => {
    expect(clearFieldError({ email: 'bad', password: 'bad' }, 'email')).toEqual({
      password: 'bad',
    });
  });

  it('keeps search queries within the backend contract limit', () => {
    expect(validateSearchQuery('x'.repeat(200))).toEqual({});
    expect(validateSearchQuery('x'.repeat(201))).toHaveProperty('q');
  });
});

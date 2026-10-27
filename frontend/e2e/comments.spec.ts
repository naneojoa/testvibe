import { expect, test } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('COMMENT-02', () => {
  test.skip(
    !email || !password,
    'Set E2E_USER_EMAIL and E2E_USER_PASSWORD for the isolated E2E environment.',
  );

  test('creates a root comment on its own post', async ({ page }) => {
    const title = `E2E comment post ${Date.now()}`;
    await page.goto('/login');
    await page.getByLabel('이메일').fill(email!);
    await page.getByLabel('비밀번호').fill(password!);
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: '내 정보' })).toBeVisible();

    await page.goto('/posts/new');
    await page.getByLabel('제목').fill(title);
    await page.getByLabel('내용').fill('Comment test post');
    await page.getByRole('button', { name: '등록하기' }).click();

    await page.getByLabel('댓글 작성').fill('E2E root comment');
    await page.getByRole('button', { name: '등록하기' }).click();
    await expect(page.getByText('E2E root comment')).toBeVisible();
  });
});

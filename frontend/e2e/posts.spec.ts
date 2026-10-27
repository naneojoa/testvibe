import { expect, test } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('POST-04 through POST-06', () => {
  test.skip(
    !email || !password,
    'Set E2E_USER_EMAIL and E2E_USER_PASSWORD for the isolated E2E environment.',
  );

  test('creates, edits, and deletes its own post', async ({ page }) => {
    const title = `E2E post ${Date.now()}`;
    await page.goto('/login');
    await page.getByLabel('이메일').fill(email!);
    await page.getByLabel('비밀번호').fill(password!);
    await page.getByRole('button', { name: '로그인' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByRole('link', { name: '내 정보' })).toBeVisible();

    await page.goto('/posts/new');
    await page.getByLabel('제목').fill(title);
    await page.getByLabel('내용').fill('E2E body');
    await page.getByRole('button', { name: '등록하기' }).click();
    await expect(page.getByRole('heading', { name: title })).toBeVisible();

    await page.getByRole('link', { name: '수정' }).click();
    await page.getByLabel('제목').fill(`${title} edited`);
    await page.getByRole('button', { name: '수정하기' }).click();
    await expect(page.getByRole('heading', { name: `${title} edited` })).toBeVisible();

    await page.getByRole('button', { name: '삭제' }).click();
    await page.getByRole('dialog').getByRole('button', { name: '확인' }).click();
    await expect(page).toHaveURL('/');
    await expect(page.getByText(`${title} edited`)).not.toBeVisible();
  });
});

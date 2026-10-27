import { expect, test } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('AUTH-02 login', () => {
  test.skip(
    !email || !password,
    'Set E2E_USER_EMAIL and E2E_USER_PASSWORD for the isolated E2E environment.',
  );

  test('signs in through the UI and keeps the session after reload', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('이메일').fill(email!);
    await page.getByLabel('비밀번호').fill(password!);
    await page.getByRole('button', { name: '로그인' }).click();

    await expect(page).toHaveURL('/');
    await page.reload();
    await expect(page.getByRole('link', { name: '내 정보' })).toBeVisible();
  });
});

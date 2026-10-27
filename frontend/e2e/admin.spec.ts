import { expect, test } from '@playwright/test';

const userEmail = process.env.E2E_USER_EMAIL;
const userPassword = process.env.E2E_USER_PASSWORD;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

async function login(page: import('@playwright/test').Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('이메일').fill(email);
  await page.getByLabel('비밀번호').fill(password);
  await page.getByRole('button', { name: '로그인' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('link', { name: '내 정보' })).toBeVisible();
}

test.describe('EDGE-07 administrator routing', () => {
  test.skip(
    !userEmail || !userPassword,
    'Set E2E_USER_EMAIL and E2E_USER_PASSWORD for the isolated E2E environment.',
  );

  test('does not expose the administrator menu to a regular user', async ({ page }) => {
    await login(page, userEmail!, userPassword!);
    await expect(page.getByRole('link', { name: '관리자' })).toHaveCount(0);
  });

  test.skip(
    !adminEmail || !adminPassword,
    'Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD for the isolated E2E environment.',
  );

  test('exposes the administrator menu to an administrator', async ({ page }) => {
    await login(page, adminEmail!, adminPassword!);
    await expect(page.getByRole('link', { name: '관리자' })).toBeVisible();
  });
});

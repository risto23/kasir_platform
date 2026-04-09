import { test, expect } from '@playwright/test';

const errorResponse = {
  success: false,
  message: 'Login gagal',
};

async function mockAuthError(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/login', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify(errorResponse),
      });
      return;
    }
    route.fallback();
  });
}

test('login error shows message', async ({ page }) => {
  await mockAuthError(page);
  await page.goto('/login');
  await page.getByPlaceholder('Masukkan email').fill('wrong@example.com');
  await page.getByPlaceholder('Masukkan password').fill('wrong');
  await page.getByRole('button', { name: 'Masuk' }).click();
  await expect(page.getByText('Login gagal')).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});
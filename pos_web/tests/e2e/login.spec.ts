import { test, expect } from '@playwright/test';

const mockLoginResponse = {
  data: {
    accessToken: 'test-token-123',
    user: {
      id: 'user-1',
      fullName: 'Super Admin',
      email: 'superadmin@pos.local',
      status: 'ACTIVE',
      lastLoginAt: null,
      platformRoles: ['SUPER_ADMIN'],
      businessMemberships: [
        {
          businessUserId: 'bu-1',
          businessId: 'b-1',
          businessName: 'Demo Resto',
          businessType: 'RESTAURANT',
          role: 'OWNER',
          status: 'ACTIVE',
          isPrimary: true,
          hasAllOutletAccess: true,
          allowedOutletIds: ['o-1'],
          permissions: [],
        },
      ],
      accessProfile: {
        isSuperAdmin: true,
        isBusinessUser: false,
        accessScope: 'PLATFORM',
        defaultBusinessMembership: null,
      },
    },
  },
};

// Helper to stub the backend API during the login flow
async function mockAuthRoutes(page: import('@playwright/test').Page) {
  await page.route('**/api/auth/login', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLoginResponse),
      });
      return;
    }
    route.fallback();
  });

  await page.route('**/api/auth/me', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockLoginResponse),
      });
      return;
    }
    route.fallback();
  });
}

test('login success redirects to dashboard', async ({ page }) => {
  await mockAuthRoutes(page);

  await page.goto('/login');

  await page.getByPlaceholder('Masukkan email').fill('superadmin@pos.local');
  await page.getByPlaceholder('Masukkan password').fill('password123');
  await page.getByRole('button', { name: 'Masuk' }).click();

  await expect(page).toHaveURL(/\/dashboard/);

});

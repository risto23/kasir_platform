import { test, expect, Page } from '@playwright/test';
import type { CurrentUser } from '../../src/types/auth';

function superAdminUser(): CurrentUser {
  return {
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
  };
}

async function mockMe(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: superAdminUser() }),
    });
  });
}

async function seedDashboardContext(page: Page) {
  await page.addInitScript((user) => {
    window.localStorage.setItem('pos_current_user', JSON.stringify(user));
    window.localStorage.setItem('activeBusinessId', 'b-1');
  }, superAdminUser());
}

test('dashboard shows quick actions for super admin restaurant', async ({ page }) => {
  await seedDashboardContext(page);
  await mockMe(page);
  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });

  await expect(page.getByTestId('dashboard-quick-actions').first()).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole('link', { name: 'Buka Kitchen Display' })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole('link', { name: 'Monitor Meja' }).first()).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByRole('link', { name: 'QR Meja' }).first()).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.getByRole('link', { name: 'Lihat Meja Outlet' }).first(),
  ).toBeVisible({
    timeout: 20000,
  });
});

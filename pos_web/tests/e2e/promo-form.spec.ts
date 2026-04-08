import { test, expect, Page } from '@playwright/test';

const metaResponse = {
  success: true,
  message: 'ok',
  data: {
    businessType: 'RESTAURANT',
    targetTypes: ['CATEGORY','PRODUCT','PRODUCT_NAME','BRAND','UNIT'],
    discountTypes: ['PERCENTAGE','FIXED_AMOUNT'],
    statuses: ['ACTIVE','INACTIVE'],
    outletScopes: ['ALL_OUTLETS','SELECTED_OUTLETS'],
    categories: [{ id: 'cat-1', name: 'Makanan', status: 'ACTIVE' }],
    products: [{ id: 'prod-1', name: 'Nasi Goreng', brand: null, unit: 'porsi', status: 'ACTIVE' }],
    outlets: [{ id: 'o-1', name: 'Outlet Demo', code: 'OUT1', status: 'ACTIVE' }],
  },
};

async function mockPromoMeta(page: Page) {
  await page.route('**/promos/meta/form', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(metaResponse) });
  });
}

async function mockMe(page: Page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: {
      id: 'u1', fullName: 'Super Admin', email: 'superadmin@pos.local', status: 'ACTIVE', lastLoginAt: null,
      platformRoles: ['SUPER_ADMIN'], businessMemberships: [], accessProfile: { isSuperAdmin: true, isBusinessUser: false, accessScope: 'PLATFORM', defaultBusinessMembership: null }
    } }) });
  });
}async function seedDashboardUser(page: Page) {
  await page.addInitScript(() => {
    const user = {
      id: 'u1', fullName: 'Super Admin', email: 'superadmin@pos.local', status: 'ACTIVE', lastLoginAt: null,
      platformRoles: ['SUPER_ADMIN'],
      businessMemberships: [{ businessUserId: 'bu-1', businessId: 'b-1', businessName: 'Demo Resto', businessType: 'RESTAURANT', role: 'OWNER', status: 'ACTIVE', isPrimary: true, hasAllOutletAccess: true, allowedOutletIds: ['o-1'], permissions: [] }],
      accessProfile: { isSuperAdmin: true, isBusinessUser: false, accessScope: 'PLATFORM', defaultBusinessMembership: null },
    };
    window.localStorage.setItem('pos_current_user', JSON.stringify(user));
    window.localStorage.setItem('activeBusinessId', 'b-1');
  });
}

test('promo form validation: empty name', async ({ page }) => {
  await seedDashboardUser(page);
  await mockMe(page);
  await mockPromoMeta(page);
  await page.goto('/dashboard/promos/create');

  await page.getByTestId('promo-form').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByTestId('promo-submit').click();
  await expect(page.getByText('Nama promo wajib diisi')).toBeVisible();
});

test('promo form validation: percentage over 100', async ({ page }) => {
  await seedDashboardUser(page);
  await mockMe(page);
  await mockPromoMeta(page);
  await page.goto('/dashboard/promos/create');

  await page.getByTestId('promo-form').waitFor({ state: 'visible', timeout: 30000 });
  await page.getByTestId('promo-name').fill('Promo Test');
  await page.getByTestId('promo-target-type').selectOption('CATEGORY');
  await page.getByTestId('promo-category').selectOption('cat-1');
  await page.getByTestId('promo-discount-type').selectOption('PERCENTAGE');
  await page.getByTestId('promo-discount-value').fill('150');

  await page.getByTestId('promo-submit').click();
  await expect(page.getByText('Diskon persen maksimal 100')).toBeVisible();
});





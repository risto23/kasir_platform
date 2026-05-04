import { test, expect, Page } from '@playwright/test';
import type { GuestMenuItem } from '../../src/types/guest';

type MockMenu = {
  success: boolean;
  message: string;
  data: {
    outlet: {
      id: string;
      name: string;
      code: string;
      address: string | null;
      phone: string | null;
    };
    table: {
      id: string;
      code: string;
      name: string;
      capacity: number | null;
    };
    categories: Array<{
      categoryId: string | null;
      categoryName: string | null;
      items: GuestMenuItem[];
    }>;
  };
};

const mockMenu: MockMenu = {
  success: true,
  message: 'ok',
  data: {
    outlet: {
      id: 'o-1',
      name: 'Outlet Demo',
      code: 'OUT1',
      address: null,
      phone: null,
    },
    table: {
      id: 't-1',
      code: 'T1',
      name: 'Meja 1',
      capacity: 4,
    },
    categories: [
      {
        categoryId: 'c-1',
        categoryName: 'Signature',
        items: [
          {
            id: 'p-1',
            categoryId: 'c-1',
            categoryName: 'Signature',
            name: 'Nasi Goreng',
            code: 'NSG',
            sku: null,
            barcode: null,
            brand: null,
            unit: 'porsi',
            description: 'Pedas manis',
            imageUrl: null,
            basePrice: 20000,
            outletPrice: 20000,
            discountAmount: 0,
            finalPrice: 20000,
            promo: null,
          },
        ],
      },
    ],
  },
};

async function mockGuestMenu(page: Page) {
  await page.route('**/outlets/*/guest/menu?*', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockMenu),
      });
      return;
    }

    route.fallback();
  });
}

test('guest menu: add to cart enables checkout', async ({ page }) => {
  await mockGuestMenu(page);
  const url = '/guest/menu?outletId=o-1&tableId=t-1&token=tok-1234567890abcd';
  await page.goto(url);

  await expect(page.getByText('Cart masih kosong')).toBeVisible();

  await page.getByRole('button', { name: 'Tambah' }).first().click();

  await expect(page.getByText('Cart masih kosong')).toBeHidden();
  await expect(page.getByRole('link', { name: 'Lanjut ke Checkout' })).toBeEnabled();
});

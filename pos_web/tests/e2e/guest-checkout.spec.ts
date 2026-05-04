import { test, expect, Page } from '@playwright/test';
import type { GuestMenuItem } from '../../src/types/guest';

function seedGuestCart(page: Page) {
  const cart = {
    outletId: 'o-1',
    tableId: 't-1',
    token: 'tok-1234567890abcd',
    items: [
      {
        productId: 'p-1',
        productName: 'Nasi Goreng',
        productCode: 'NSG',
        quantity: 2,
        unitPrice: 20000,
        note: null,
        imageUrl: null,
      },
    ],
  };

  return page.addInitScript((value) => {
    window.sessionStorage.setItem('pos_guest_cart_v1', JSON.stringify(value));
  }, cart);
}

function mockGuestMenu(page: Page) {
  const menuItems: GuestMenuItem[] = [
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
  ];

  return page.route('**/outlets/*/guest/menu?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
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
              items: menuItems,
            },
          ],
        },
      }),
    });
  });
}

function mockCreateOrder(page: Page) {
  return page.route('**/outlets/*/guest/orders', async (route) => {
    const body = route.request().postDataJSON();
    const now = new Date().toISOString();
    const response = {
      success: true,
      message: 'created',
      data: {
        id: 'ord-1',
        businessId: 'b-1',
        outletId: 'o-1',
        tableId: 't-1',
        orderNumber: 'SO-001',
        status: 'OPEN',
        paymentStatus: 'UNPAID',
        guestName: body.guestName ?? null,
        notes: body.notes ?? null,
        subtotal: 40000,
        discountAmount: 0,
        taxAmount: 0,
        serviceChargeAmount: 0,
        totalAmount: 40000,
        submittedAt: now,
        createdAt: now,
        items: [
          {
            id: 'oi-1',
            productId: 'p-1',
            productName: 'Nasi Goreng',
            productCode: 'NSG',
            quantity: 2,
            unitPrice: 20000,
            discountAmount: 0,
            lineSubtotal: 40000,
            lineTotal: 40000,
            note: null,
            status: 'PENDING',
          },
        ],
      },
    };

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

test('guest checkout: submit order shows success', async ({ page }) => {
  await seedGuestCart(page);
  await mockGuestMenu(page);
  await mockCreateOrder(page);

  const url = '/guest/checkout?outletId=o-1&tableId=t-1&token=tok-1234567890abcd';
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await expect(page.getByRole('button', { name: 'Kirim ke Kasir' })).toBeEnabled({
    timeout: 30000,
  });
  await page.getByRole('button', { name: 'Kirim ke Kasir' }).click();

  await expect(page.getByText('Pesanan berhasil dikirim')).toBeVisible();
});

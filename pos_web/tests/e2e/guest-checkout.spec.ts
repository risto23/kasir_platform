import { test, expect, Page } from '@playwright/test';

function seedGuestCart(page: Page) {
  const cart = {
    outletId: 'o-1',
    tableId: 't-1',
    token: 'tok-1234567890abcd',
    items: [
      { productId: 'p-1', productName: 'Nasi Goreng', productCode: 'NSG', quantity: 2, unitPrice: 20000, note: null, imageUrl: null },
    ],
  };

  return page.addInitScript((value) => {
    window.sessionStorage.setItem('pos_guest_cart_v1', JSON.stringify(value));
  }, cart);
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
        businessId: 'b-1', outletId: 'o-1', tableId: 't-1', orderNumber: 'SO-001', status: 'OPEN', paymentStatus: 'UNPAID',
        guestName: body.guestName ?? null, notes: body.notes ?? null,
        subtotal: 40000, discountAmount: 0, taxAmount: 0, serviceChargeAmount: 0, totalAmount: 40000,
        submittedAt: now, createdAt: now,
        items: [ { id: 'oi-1', productId: 'p-1', productName: 'Nasi Goreng', productCode: 'NSG', quantity: 2, unitPrice: 20000, discountAmount: 0, lineSubtotal: 40000, lineTotal: 40000, note: null, status: 'PENDING' } ],
      },
    };
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(response) });
  });
}

test('guest checkout: submit order shows success', async ({ page }) => {
  await seedGuestCart(page);
  await mockCreateOrder(page);
  const url = '/guest/checkout?outletId=o-1&tableId=t-1&token=tok-1234567890abcd';
  await page.goto(url);

  await expect(page.getByRole('button', { name: 'Kirim ke Kasir' })).toBeEnabled();
  await page.getByRole('button', { name: 'Kirim ke Kasir' }).click();

  await expect(page.getByText('Pesanan berhasil dikirim')).toBeVisible();
});
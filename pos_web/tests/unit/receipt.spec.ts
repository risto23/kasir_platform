import { beforeEach, describe, expect, it, vi } from 'vitest';

const apiGet = vi.fn();

vi.mock('@/lib/api', () => ({
  api: {
    get: apiGet,
  },
}));

vi.mock('@/lib/auth', () => ({
  getActiveBusinessId: () => 'business-1',
}));

function buildReceiptRow() {
  return {
    id: 'receipt-1',
    receiptNumber: 'RCT-20260929-0001',
    businessId: 'business-1',
    outletId: 'outlet-1',
    businessName: 'Kopi Senja',
    outletName: 'Outlet Pusat',
    outletAddress: 'Jl. Merdeka 1',
    issuedAt: '2026-09-29T07:00:00.000Z',
    printedAt: null,
    order: {
      id: 'order-1',
      orderNumber: 'ORD-20260929-0001',
      status: 'SUBMITTED',
      paymentStatus: 'PAID',
      subtotal: '50000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      serviceChargeAmount: '0.00',
      totalAmount: '50000.00',
    },
    payment: {
      id: 'payment-1',
      paymentNumber: 'PAY-20260929-0001',
      method: 'QRIS',
      status: 'PAID',
      amountPaid: '50700.00',
      amountTendered: '50700.00',
      changeAmount: '0.00',
      surchargeAmount: '700.00',
      paidAt: '2026-09-29T07:00:00.000Z',
    },
    contentSnapshot: {
      orderId: 'order-1',
      orderNumber: 'ORD-20260929-0001',
      businessName: 'Kopi Senja',
      outletName: 'Outlet Pusat',
      tableName: 'Meja 3',
      customerName: 'Budi',
      cashierName: 'Siti Kasir',
      notes: null,
      subtotal: '50000.00',
      discountAmount: '0.00',
      taxAmount: '0.00',
      serviceChargeAmount: '0.00',
      surchargeAmount: '700.00',
      totalAmount: '50000.00',
      items: [],
    },
  };
}

describe('receipt lib mapping', () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it('keeps cashier, customer and surcharge fields from the snapshot', async () => {
    apiGet.mockResolvedValue({ data: { success: true, data: buildReceiptRow() } });

    const { getReceiptDetail } = await import('@/lib/receipt');
    const receipt = await getReceiptDetail('receipt-1', 'outlet-1');

    expect(receipt.contentSnapshot?.cashierName).toBe('Siti Kasir');
    expect(receipt.contentSnapshot?.customerName).toBe('Budi');
    expect(receipt.contentSnapshot?.surchargeAmount).toBe(700);
    expect(receipt.payment?.surchargeAmount).toBe(700);
    expect(receipt.payment?.method).toBe('QRIS');
  });
});

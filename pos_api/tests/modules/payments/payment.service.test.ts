import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import {
  createPayment,
  getPaymentById,
  listPayments,
} from '../../../src/modules/payments/payment.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    businessSubscription: {
      findFirst: jest.fn(),
    },
    payment: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  },
}));

jest.mock('../../../src/modules/receipts/receipt.service', () => ({
  createReceiptForPaidOrder: jest.fn(),
}));

type TransactionMock = {
  order: {
    findFirst: jest.Mock;
    update: jest.Mock;
  };
  businessSubscription: {
    findFirst: jest.Mock;
  };
  payment: {
    findFirst: jest.Mock;
    count: jest.Mock;
    create: jest.Mock;
  };
};

type PaymentPrismaMock = {
  prisma: {
    $transaction: jest.Mock;
    businessSubscription: {
      findFirst: jest.Mock;
    };
    payment: {
      count: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
    };
  };
};

type ReceiptServiceMock = {
  createReceiptForPaidOrder: jest.Mock;
};

describe('payment.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as PaymentPrismaMock;
  const receiptServiceMock = jest.requireMock('../../../src/modules/receipts/receipt.service') as ReceiptServiceMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('rejects createPayment when order is not found', async () => {
    const tx: TransactionMock = {
      order: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        update: jest.fn(),
      },
      businessSubscription: {
        findFirst: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };
    prismaMock.prisma.$transaction.mockImplementationOnce(async (callback: (tx: TransactionMock) => Promise<unknown>) => callback(tx));

    await expect(
      createPayment({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amountPaid: 10000,
      }),
    ).rejects.toThrow('Order tidak ditemukan');
  });

  it('rejects cancelled and already paid orders', async () => {
    const tx: TransactionMock = {
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'order-1',
            status: OrderStatus.CANCELLED,
            paymentStatus: PaymentStatus.UNPAID,
            totalAmount: new Prisma.Decimal(10000),
          })
          .mockResolvedValueOnce({
            id: 'order-1',
            status: OrderStatus.SUBMITTED,
            paymentStatus: PaymentStatus.PAID,
            totalAmount: new Prisma.Decimal(10000),
          }),
        update: jest.fn(),
      },
      businessSubscription: {
        findFirst: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };
    prismaMock.prisma.$transaction.mockImplementation(async (callback: (tx: TransactionMock) => Promise<unknown>) => callback(tx));

    await expect(
      createPayment({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amountPaid: 10000,
      }),
    ).rejects.toThrow('Order yang dibatalkan tidak bisa dibayar');

    await expect(
      createPayment({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amountPaid: 10000,
      }),
    ).rejects.toThrow('Order ini sudah dibayar');
  });

  it('rejects insufficient payment and tendered amount lower than paid', async () => {
    const tx: TransactionMock = {
      order: {
        findFirst: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'order-1',
            status: OrderStatus.SUBMITTED,
            paymentStatus: PaymentStatus.UNPAID,
            totalAmount: new Prisma.Decimal(10000),
          })
          .mockResolvedValueOnce({
            id: 'order-1',
            status: OrderStatus.SUBMITTED,
            paymentStatus: PaymentStatus.UNPAID,
            totalAmount: new Prisma.Decimal(10000),
          }),
        update: jest.fn(),
      },
      businessSubscription: {
        findFirst: jest.fn(),
      },
      payment: {
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
    };
    prismaMock.prisma.$transaction.mockImplementation(async (callback: (tx: TransactionMock) => Promise<unknown>) => callback(tx));

    await expect(
      createPayment({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amountPaid: 5000,
      }),
    ).rejects.toThrow('Jumlah pembayaran kurang dari total order');

    await expect(
      createPayment({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amountPaid: 10000,
        amountTendered: 9000,
      }),
    ).rejects.toThrow('Amount tendered tidak boleh lebih kecil dari amount paid');
  });

  it('creates payment and receipt successfully', async () => {
    const tx: TransactionMock = {
      order: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'order-1',
          status: OrderStatus.DRAFT,
          paymentStatus: PaymentStatus.UNPAID,
          totalAmount: new Prisma.Decimal(10000),
        }),
        update: jest.fn().mockResolvedValueOnce({ id: 'order-1' }),
      },
      businessSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'sub-1',
          status: 'ACTIVE',
          plan: {
            id: 'plan-1',
            code: 'BASIC',
            name: 'Basic',
            maxOutlets: 2,
            maxUsers: 10,
            maxProducts: 100,
            maxMonthlyTransactions: 1000,
          },
        }),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        count: jest.fn().mockResolvedValueOnce(100),
        create: jest.fn().mockResolvedValueOnce({
          id: 'payment-1',
          paymentNumber: 'PAY-20260501-0001',
          orderId: 'order-1',
          businessId: 'biz-1',
          outletId: 'outlet-1',
          method: PaymentMethod.CASH,
          status: PaymentStatus.PAID,
          amountPaid: new Prisma.Decimal(10000),
          amountTendered: new Prisma.Decimal(12000),
          changeAmount: new Prisma.Decimal(2000),
          note: 'paid',
          paidAt: new Date('2026-05-01T10:00:00.000Z'),
        }),
      },
    };
    prismaMock.prisma.$transaction.mockImplementationOnce(async (callback: (tx: TransactionMock) => Promise<unknown>) => callback(tx));
    receiptServiceMock.createReceiptForPaidOrder.mockResolvedValueOnce({
      id: 'receipt-1',
      receiptNumber: 'RCT-1',
    });

    const result = await createPayment({
      businessId: 'biz-1',
      outletId: 'outlet-1',
      businessUserId: 'bu-1',
      orderId: 'order-1',
      method: PaymentMethod.CASH,
      amountPaid: 10000,
      amountTendered: 12000,
      note: ' paid ',
    });

    expect(tx.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.SUBMITTED,
        }),
      }),
    );
    expect(receiptServiceMock.createReceiptForPaidOrder).toHaveBeenCalled();
    expect(result.receiptNumber).toBe('RCT-1');
    expect(result.changeAmount).toBe('2000.00');
  });

  it('blocks final payment when monthly transaction limit is reached', async () => {
    const tx: TransactionMock = {
      order: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'order-1',
          status: OrderStatus.SUBMITTED,
          paymentStatus: PaymentStatus.UNPAID,
          totalAmount: new Prisma.Decimal(10000),
        }),
        update: jest.fn(),
      },
      businessSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'sub-1',
          status: 'PAST_DUE',
          plan: {
            id: 'plan-1',
            code: 'BASIC',
            name: 'Basic',
            maxOutlets: 2,
            maxUsers: 10,
            maxProducts: 100,
            maxMonthlyTransactions: 10,
          },
        }),
      },
      payment: {
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValueOnce(10),
        create: jest.fn(),
      },
    };
    prismaMock.prisma.$transaction.mockImplementationOnce(async (callback: (tx: TransactionMock) => Promise<unknown>) => callback(tx));

    await expect(
      createPayment({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        orderId: 'order-1',
        method: PaymentMethod.CASH,
        amountPaid: 10000,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errors: {
        blockedAction: 'CREATE_FINAL_PAYMENT',
        limit: 10,
        usage: 10,
      },
    });

    expect(tx.payment.create).not.toHaveBeenCalled();
  });

  it('lists payments and maps receipt fields', async () => {
    prismaMock.prisma.payment.count.mockResolvedValueOnce(1);
    prismaMock.prisma.payment.findMany.mockResolvedValueOnce([
      {
        id: 'payment-1',
        paymentNumber: 'PAY-1',
        orderId: 'order-1',
        businessId: 'biz-1',
        outletId: 'outlet-1',
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        amountPaid: new Prisma.Decimal(10000),
        amountTendered: new Prisma.Decimal(10000),
        changeAmount: new Prisma.Decimal(0),
        note: null,
        paidAt: new Date('2026-05-01T10:00:00.000Z'),
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        order: { orderNumber: 'ORD-1' },
        receipt: { id: 'receipt-1', receiptNumber: 'RCT-1' },
      },
    ]);

    const result = await listPayments({
      businessId: 'biz-1',
      outletId: 'outlet-1',
      page: 1,
      perPage: 10,
      search: ' PAY-1 ',
    });

    expect(prismaMock.prisma.payment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
    expect(result.items[0]?.receiptNumber).toBe('RCT-1');
    expect(result.meta.totalPages).toBe(1);
  });

  it('returns payment detail or throws when missing', async () => {
    prismaMock.prisma.payment.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'payment-1',
        paymentNumber: 'PAY-1',
        orderId: 'order-1',
        businessId: 'biz-1',
        outletId: 'outlet-1',
        method: PaymentMethod.CASH,
        status: PaymentStatus.PAID,
        amountPaid: new Prisma.Decimal(10000),
        amountTendered: new Prisma.Decimal(10000),
        changeAmount: new Prisma.Decimal(0),
        note: null,
        paidAt: null,
        createdAt: new Date('2026-05-01T10:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        order: { orderNumber: 'ORD-1' },
        receipt: null,
      });

    await expect(
      getPaymentById({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        paymentId: 'payment-404',
      }),
    ).rejects.toThrow('Payment tidak ditemukan');

    const result = await getPaymentById({
      businessId: 'biz-1',
      outletId: 'outlet-1',
      paymentId: 'payment-1',
    });

    expect(result.paymentNumber).toBe('PAY-1');
    expect(result.receipt).toBeNull();
  });
});

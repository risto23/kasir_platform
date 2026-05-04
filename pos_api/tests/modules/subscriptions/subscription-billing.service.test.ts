import {
  PaymentMethod,
  Prisma,
  SubscriptionInvoiceStatus,
  SubscriptionPaymentStatus,
  SubscriptionScheduleChangeStatus,
  SubscriptionStatus,
} from '@prisma/client';
import {
  generateRecurringSubscriptionInvoices,
  markOverdueSubscriptionInvoices,
  recordSubscriptionInvoicePayment,
  runSubscriptionBillingCycle,
} from '../../../src/modules/subscriptions/subscription-billing.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    businessSubscription: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
    },
    subscriptionInvoice: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    subscriptionPayment: {
      create: jest.fn(),
    },
    subscriptionScheduleChange: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

type BillingPrismaMock = {
  prisma: {
    $transaction: jest.Mock;
    businessSubscription: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    plan: {
      findFirst: jest.Mock;
    };
    subscriptionInvoice: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    subscriptionPayment: {
      create: jest.Mock;
    };
    subscriptionScheduleChange: {
      findMany: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
  };
};

describe('subscription-billing.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as BillingPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock.prisma.$transaction.mockImplementation(
      async (
        callback: (tx: {
          businessSubscription: BillingPrismaMock['prisma']['businessSubscription'];
          plan: BillingPrismaMock['prisma']['plan'];
          subscriptionInvoice: BillingPrismaMock['prisma']['subscriptionInvoice'];
          subscriptionPayment: BillingPrismaMock['prisma']['subscriptionPayment'];
          subscriptionScheduleChange: BillingPrismaMock['prisma']['subscriptionScheduleChange'];
        }) => Promise<unknown>,
      ) =>
        callback({
          businessSubscription: prismaMock.prisma.businessSubscription,
          plan: prismaMock.prisma.plan,
          subscriptionInvoice: prismaMock.prisma.subscriptionInvoice,
          subscriptionPayment: prismaMock.prisma.subscriptionPayment,
          subscriptionScheduleChange: prismaMock.prisma.subscriptionScheduleChange,
        }),
    );
  });

  it('generates recurring invoice for eligible subscription without duplicates', async () => {
    prismaMock.prisma.businessSubscription.findMany.mockResolvedValueOnce([
      {
        id: 'sub-1',
        businessId: 'biz-1',
        planId: 'plan-1',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
        trialEndsAt: null,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
        suspendedAt: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        plan: {
          id: 'plan-1',
          name: 'Basic',
          monthlyPrice: new Prisma.Decimal(299000),
          currencyCode: 'IDR',
        },
      },
      {
        id: 'sub-2',
        businessId: 'biz-2',
        planId: 'plan-2',
        status: SubscriptionStatus.ACTIVE,
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
        trialEndsAt: null,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
        suspendedAt: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        plan: {
          id: 'plan-2',
          name: 'Pro',
          monthlyPrice: new Prisma.Decimal(499000),
          currencyCode: 'IDR',
        },
      },
    ]);
    prismaMock.prisma.subscriptionInvoice.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'existing-invoice' });
    prismaMock.prisma.subscriptionInvoice.create.mockResolvedValueOnce({
      id: 'invoice-1',
      invoiceNumber: 'SINV-202606-0001',
      billingPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
      billingPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
      dueDate: new Date('2026-05-31T23:59:59.999Z'),
      totalAmount: new Prisma.Decimal(299000),
      status: SubscriptionInvoiceStatus.ISSUED,
    });

    const result = await generateRecurringSubscriptionInvoices({
      now: new Date('2026-05-26T10:00:00.000Z'),
      leadDays: 7,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.invoiceNumber).toBe('SINV-202606-0001');
    expect(prismaMock.prisma.subscriptionInvoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: SubscriptionInvoiceStatus.ISSUED,
          subtotal: new Prisma.Decimal(299000),
          totalAmount: new Prisma.Decimal(299000),
        }),
      }),
    );
  });

  it('marks issued invoices as overdue when due date has passed', async () => {
    prismaMock.prisma.subscriptionInvoice.updateMany.mockResolvedValueOnce({
      count: 3,
    });

    const count = await markOverdueSubscriptionInvoices({
      now: new Date('2026-06-05T00:00:00.000Z'),
    });

    expect(count).toBe(3);
    expect(prismaMock.prisma.subscriptionInvoice.updateMany).toHaveBeenCalledWith({
      where: {
        status: SubscriptionInvoiceStatus.ISSUED,
        paidAt: null,
        dueDate: {
          lt: new Date('2026-06-05T00:00:00.000Z'),
        },
      },
      data: {
        status: SubscriptionInvoiceStatus.OVERDUE,
      },
    });
  });

  it('records manual payment, closes invoice, and reactivates suspended subscription', async () => {
    prismaMock.prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce({
      id: 'invoice-1',
      businessId: 'biz-1',
      subscriptionId: 'sub-1',
      invoiceNumber: 'SINV-202606-0001',
      billingPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
      billingPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
      totalAmount: new Prisma.Decimal(299000),
      status: SubscriptionInvoiceStatus.OVERDUE,
      dueDate: new Date('2026-05-31T23:59:59.999Z'),
      paidAt: null,
      payments: [],
      subscription: {
        id: 'sub-1',
        status: SubscriptionStatus.SUSPENDED,
        trialEndsAt: null,
        currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
        graceEndsAt: new Date('2026-06-07T23:59:59.999Z'),
        suspendedAt: new Date('2026-06-08T00:00:00.000Z'),
      },
    });
    prismaMock.prisma.subscriptionPayment.create.mockResolvedValueOnce({
      id: 'sub-pay-1',
      method: PaymentMethod.TRANSFER,
      amount: new Prisma.Decimal(299000),
      status: SubscriptionPaymentStatus.PAID,
      referenceNumber: 'PAY-SUB-001',
      paidAt: new Date('2026-06-10T10:00:00.000Z'),
    });
    prismaMock.prisma.subscriptionInvoice.update.mockResolvedValueOnce({
      id: 'invoice-1',
    });
    prismaMock.prisma.businessSubscription.update.mockResolvedValueOnce({
      status: SubscriptionStatus.ACTIVE,
      currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
      graceEndsAt: null,
      suspendedAt: null,
    });

    const result = await recordSubscriptionInvoicePayment({
      businessId: 'biz-1',
      invoiceId: 'invoice-1',
      method: PaymentMethod.TRANSFER,
      amount: 299000,
      referenceNumber: 'PAY-SUB-001',
      paidAt: new Date('2026-06-10T10:00:00.000Z'),
    });

    expect(result.invoiceStatus).toBe(SubscriptionInvoiceStatus.PAID);
    expect(result.outstandingAmount).toBe(0);
    expect(result.subscription.status).toBe(SubscriptionStatus.ACTIVE);
    expect(prismaMock.prisma.subscriptionPayment.create).toHaveBeenCalledWith({
      data: {
        invoiceId: 'invoice-1',
        method: PaymentMethod.TRANSFER,
        amount: new Prisma.Decimal(299000),
        status: SubscriptionPaymentStatus.PAID,
        referenceNumber: 'PAY-SUB-001',
        paidAt: new Date('2026-06-10T10:00:00.000Z'),
      },
    });
    expect(prismaMock.prisma.businessSubscription.update).toHaveBeenCalledWith({
      where: {
        id: 'sub-1',
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
        graceEndsAt: null,
        suspendedAt: null,
      },
      select: {
        status: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        graceEndsAt: true,
        suspendedAt: true,
      },
    });
  });

  it('runs full billing cycle and applies renewal, grace, suspension summary', async () => {
    prismaMock.prisma.subscriptionInvoice.updateMany.mockResolvedValueOnce({
      count: 1,
    });
    prismaMock.prisma.subscriptionInvoice.findMany
      .mockResolvedValueOnce([
        {
          id: 'invoice-paid-1',
          subscriptionId: 'sub-paid-1',
          billingPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
          billingPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
          dueDate: new Date('2026-05-31T23:59:59.999Z'),
          status: SubscriptionInvoiceStatus.PAID,
          paidAt: new Date('2026-06-02T10:00:00.000Z'),
          subscription: {
            id: 'sub-paid-1',
            status: SubscriptionStatus.PAST_DUE,
            trialEndsAt: null,
            currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
            graceEndsAt: new Date('2026-06-07T23:59:59.999Z'),
            suspendedAt: null,
          },
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'invoice-overdue-1',
          subscriptionId: 'sub-overdue-1',
          billingPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
          billingPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
          dueDate: new Date('2026-05-31T23:59:59.999Z'),
          status: SubscriptionInvoiceStatus.OVERDUE,
          paidAt: null,
          subscription: {
            id: 'sub-overdue-1',
            status: SubscriptionStatus.ACTIVE,
            trialEndsAt: null,
            currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
            currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
            graceEndsAt: null,
            suspendedAt: null,
          },
        },
      ]);
    prismaMock.prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce({
      id: 'invoice-next-1',
      payments: [],
    });
    prismaMock.prisma.subscriptionScheduleChange.findMany.mockResolvedValueOnce([
      {
        id: 'change-1',
        businessId: 'biz-1',
        subscriptionId: 'sub-paid-1',
        toPlanId: 'plan-target-1',
        type: 'DOWNGRADE',
        effectiveAt: new Date('2026-05-31T23:59:59.999Z'),
        requestedAt: new Date('2026-05-20T10:00:00.000Z'),
        toPlan: {
          id: 'plan-target-1',
          monthlyPrice: new Prisma.Decimal(199000),
        },
        subscription: {
          id: 'sub-paid-1',
          status: SubscriptionStatus.ACTIVE,
          currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
        },
      },
    ]);
    prismaMock.prisma.businessSubscription.findMany
      .mockResolvedValueOnce([
        {
          id: 'sub-cancel-1',
          businessId: 'biz-cancel-1',
        },
      ])
      .mockResolvedValueOnce([{ id: 'sub-suspend-1' }])
      .mockResolvedValueOnce([]);
    prismaMock.prisma.businessSubscription.update
      .mockResolvedValueOnce({
        id: 'sub-paid-1',
      })
      .mockResolvedValueOnce({
        id: 'sub-paid-1',
      })
      .mockResolvedValueOnce({
        id: 'sub-cancel-1',
      })
      .mockResolvedValueOnce({
        id: 'sub-overdue-1',
      })
      .mockResolvedValueOnce({
        id: 'sub-suspend-1',
      });
    prismaMock.prisma.subscriptionInvoice.update.mockResolvedValueOnce({
      id: 'invoice-next-1',
    });
    prismaMock.prisma.subscriptionScheduleChange.update.mockResolvedValueOnce({
      id: 'change-1',
      status: SubscriptionScheduleChangeStatus.APPLIED,
    });
    prismaMock.prisma.subscriptionScheduleChange.updateMany.mockResolvedValueOnce({
      count: 1,
    });

    const result = await runSubscriptionBillingCycle({
      now: new Date('2026-06-10T10:00:00.000Z'),
      leadDays: 7,
      graceDays: 7,
    });

    expect(result).toEqual({
      generatedCount: 0,
      overdueMarkedCount: 1,
      activatedRenewalCount: 1,
      appliedScheduledChangeCount: 1,
      cancelledAtPeriodEndCount: 1,
      pastDueCount: 1,
      suspendedCount: 1,
      generatedInvoices: [],
    });
    expect(prismaMock.prisma.businessSubscription.update).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'sub-paid-1',
      },
      data: {
        status: SubscriptionStatus.ACTIVE,
        trialEndsAt: null,
        currentPeriodStart: new Date('2026-06-01T00:00:00.000Z'),
        currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
        graceEndsAt: null,
        suspendedAt: null,
      },
    });
    expect(prismaMock.prisma.businessSubscription.update).toHaveBeenNthCalledWith(2, {
      where: {
        id: 'sub-paid-1',
      },
      data: {
        planId: 'plan-target-1',
      },
    });
    expect(prismaMock.prisma.subscriptionInvoice.update).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'invoice-next-1',
      },
      data: {
        subtotal: new Prisma.Decimal(199000),
        taxAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(199000),
      },
    });
    expect(prismaMock.prisma.businessSubscription.update).toHaveBeenNthCalledWith(3, {
      where: {
        id: 'sub-cancel-1',
      },
      data: {
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: new Date('2026-06-10T10:00:00.000Z'),
        graceEndsAt: null,
        suspendedAt: null,
      },
    });
    expect(prismaMock.prisma.businessSubscription.update).toHaveBeenNthCalledWith(4, {
      where: {
        id: 'sub-overdue-1',
      },
      data: {
        status: SubscriptionStatus.PAST_DUE,
        graceEndsAt: new Date('2026-06-07T23:59:59.999Z'),
        suspendedAt: null,
      },
    });
    expect(prismaMock.prisma.businessSubscription.update).toHaveBeenNthCalledWith(5, {
      where: {
        id: 'sub-suspend-1',
      },
      data: {
        status: SubscriptionStatus.SUSPENDED,
        suspendedAt: new Date('2026-06-10T10:00:00.000Z'),
      },
    });
  });
});

import { Prisma } from '@prisma/client';
import {
  cancelSubscriptionByBusiness,
  changeSubscriptionPlanByBusiness,
  getCurrentSubscriptionByBusiness,
  getSubscriptionChangePreviewByBusiness,
  getSubscriptionInvoiceDetailByBusiness,
  getCurrentUsageByBusiness,
  getSubscriptionInvoicesByBusiness,
  getSubscriptionPlansByBusinessType,
  reactivateSubscriptionByBusiness,
  startSubscriptionByBusiness,
} from '../../../src/modules/subscriptions/subscriptions.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    plan: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    business: {
      findUnique: jest.fn(),
    },
    businessSubscription: {
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    outlet: {
      count: jest.fn(),
    },
    businessUser: {
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
    payment: {
      count: jest.fn(),
    },
    subscriptionUsageMonthly: {
      upsert: jest.fn(),
    },
    subscriptionInvoice: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    subscriptionScheduleChange: {
      updateMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('subscriptions.service', () => {
  const { prisma } = jest.requireMock('../../../src/config/prisma');

  beforeEach(() => {
    jest.resetAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-20T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  function makePlan(input: {
    id: string;
    code: string;
    name: string;
    monthlyPrice: number;
    businessType: 'RETAIL' | 'RESTAURANT' | null;
    maxOutlets: number | null;
    maxUsers: number | null;
    maxProducts: number | null;
    maxMonthlyTransactions: number | null;
  }) {
    return {
      id: input.id,
      code: input.code,
      name: input.name,
      description: null,
      monthlyPrice: input.monthlyPrice,
      currencyCode: 'IDR',
      businessType: input.businessType,
      isCustomPricing: false,
      isActive: true,
      maxOutlets: input.maxOutlets,
      maxUsers: input.maxUsers,
      maxProducts: input.maxProducts,
      maxMonthlyTransactions: input.maxMonthlyTransactions,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    };
  }

  function makeSubscription(plan: ReturnType<typeof makePlan>) {
    return {
      id: 'sub-1',
      businessId: 'biz-1',
      planId: plan.id,
      status: 'ACTIVE',
      startedAt: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
      trialEndsAt: null,
      graceEndsAt: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      suspendedAt: null,
      notes: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      plan,
    };
  }

  it('returns plans sorted by display order', async () => {
    prisma.plan.findMany.mockResolvedValueOnce([
      {
        id: 'p-business',
        code: 'BUSINESS',
        name: 'Business',
        description: null,
        monthlyPrice: 1299000,
        currencyCode: 'IDR',
        businessType: null,
        isCustomPricing: false,
        isActive: true,
        maxOutlets: 10,
        maxUsers: 30,
        maxProducts: 20000,
        maxMonthlyTransactions: 50000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'p-basic',
        code: 'BASIC',
        name: 'Basic',
        description: null,
        monthlyPrice: 299000,
        currencyCode: 'IDR',
        businessType: null,
        isCustomPricing: false,
        isActive: true,
        maxOutlets: 2,
        maxUsers: 8,
        maxProducts: 500,
        maxMonthlyTransactions: 5000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'p-retail-pro',
        code: 'RETAIL_PRO',
        name: 'Retail Pro',
        description: null,
        monthlyPrice: 499000,
        currencyCode: 'IDR',
        businessType: 'RETAIL',
        isCustomPricing: false,
        isActive: true,
        maxOutlets: 3,
        maxUsers: 12,
        maxProducts: 5000,
        maxMonthlyTransactions: 12000,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await getSubscriptionPlansByBusinessType('RETAIL');

    expect(result.map((item) => item.code)).toEqual([
      'BASIC',
      'RETAIL_PRO',
      'BUSINESS',
    ]);
  });

  it('returns live usage against current retail plan limits and stores monthly snapshot', async () => {
    prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1',
      businessId: 'biz-1',
      planId: 'plan-1',
      status: 'ACTIVE',
      startedAt: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
      trialEndsAt: null,
      graceEndsAt: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      suspendedAt: null,
      notes: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      plan: {
        id: 'plan-1',
        code: 'RETAIL_PRO',
        name: 'Retail Pro',
        description: 'Retail plan',
        monthlyPrice: 499000,
        currencyCode: 'IDR',
        businessType: 'RETAIL',
        isCustomPricing: false,
        isActive: true,
        maxOutlets: 3,
        maxUsers: 12,
        maxProducts: 5000,
        maxMonthlyTransactions: 12000,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
    prisma.outlet.count.mockResolvedValueOnce(2);
    prisma.businessUser.count.mockResolvedValueOnce(6);
    prisma.product.count.mockResolvedValueOnce(120);
    prisma.payment.count.mockResolvedValueOnce(24);
    prisma.subscriptionUsageMonthly.upsert.mockResolvedValueOnce({
      id: 'usage-1',
    });

    const result = await getCurrentUsageByBusiness('biz-1');

    expect(result.plan.code).toBe('RETAIL_PRO');
    expect(result.yearMonth).toBe('2026-05');
    expect(result.usage).toEqual({
      outlets: 2,
      users: 6,
      products: 120,
      monthlyTransactions: 24,
    });
    expect(result.remaining).toEqual({
      outlets: 1,
      users: 6,
      products: 4880,
      monthlyTransactions: 11976,
    });
    expect(prisma.payment.count).toHaveBeenCalledWith({
      where: {
        businessId: 'biz-1',
        status: 'PAID',
        paidAt: {
          gte: new Date('2026-04-30T17:00:00.000Z'),
          lte: new Date('2026-05-31T16:59:59.999Z'),
        },
        order: {
          status: {
            not: 'CANCELLED',
          },
        },
      },
    });
    expect(prisma.subscriptionUsageMonthly.upsert).toHaveBeenCalledWith({
      where: {
        businessId_yearMonth: {
          businessId: 'biz-1',
          yearMonth: '2026-05',
        },
      },
      create: {
        businessId: 'biz-1',
        yearMonth: '2026-05',
        outletCount: 2,
        userCount: 6,
        productCount: 120,
        transactionCount: 24,
      },
      update: {
        outletCount: 2,
        userCount: 6,
        productCount: 120,
        transactionCount: 24,
      },
    });
  });

  it('returns usage for restaurant business and keeps unlimited limits as null', async () => {
    prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-restaurant-1',
      businessId: 'biz-restaurant-1',
      planId: 'plan-restaurant-1',
      status: 'TRIAL',
      startedAt: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      currentPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
      trialEndsAt: new Date('2026-05-31T23:59:59.999Z'),
      graceEndsAt: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      suspendedAt: null,
      notes: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      plan: {
        id: 'plan-restaurant-1',
        code: 'ENTERPRISE',
        name: 'Enterprise',
        description: 'Restaurant enterprise plan',
        monthlyPrice: 0,
        currencyCode: 'IDR',
        businessType: 'RESTAURANT',
        isCustomPricing: true,
        isActive: true,
        maxOutlets: null,
        maxUsers: null,
        maxProducts: null,
        maxMonthlyTransactions: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    });
    prisma.outlet.count.mockResolvedValueOnce(4);
    prisma.businessUser.count.mockResolvedValueOnce(18);
    prisma.product.count.mockResolvedValueOnce(320);
    prisma.payment.count.mockResolvedValueOnce(890);
    prisma.subscriptionUsageMonthly.upsert.mockResolvedValueOnce({
      id: 'usage-restaurant-1',
    });

    const result = await getCurrentUsageByBusiness('biz-restaurant-1');

    expect(result.plan.businessType).toBe('RESTAURANT');
    expect(result.subscriptionStatus).toBe('TRIAL');
    expect(result.usage).toEqual({
      outlets: 4,
      users: 18,
      products: 320,
      monthlyTransactions: 890,
    });
    expect(result.remaining).toEqual({
      outlets: null,
      users: null,
      products: null,
      monthlyTransactions: null,
    });
  });

  it('returns latest cancelled subscription when no active subscription remains', async () => {
    const cancelledPlan = makePlan({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      monthlyPrice: 299000,
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
    });
    const cancelledSubscription = {
      ...makeSubscription(cancelledPlan),
      status: 'CANCELLED',
      cancelledAt: new Date('2026-06-01T00:00:00.000Z'),
    };

    prisma.businessSubscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(cancelledSubscription);

    const result = await getCurrentSubscriptionByBusiness('biz-1');

    expect(result.status).toBe('CANCELLED');
    expect(result.cancelledAt).toBe('2026-06-01T00:00:00.000Z');
    expect(result.plan.code).toBe('BASIC');
  });

  it('returns usage snapshot for cancelled subscription state', async () => {
    const cancelledPlan = makePlan({
      id: 'plan-business',
      code: 'BUSINESS',
      name: 'Business',
      monthlyPrice: 1299000,
      businessType: null,
      maxOutlets: 10,
      maxUsers: 30,
      maxProducts: 20000,
      maxMonthlyTransactions: 50000,
    });
    const cancelledSubscription = {
      ...makeSubscription(cancelledPlan),
      status: 'CANCELLED',
      cancelledAt: new Date('2026-06-01T00:00:00.000Z'),
    };

    prisma.businessSubscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(cancelledSubscription);
    prisma.outlet.count.mockResolvedValueOnce(2);
    prisma.businessUser.count.mockResolvedValueOnce(7);
    prisma.product.count.mockResolvedValueOnce(180);
    prisma.payment.count.mockResolvedValueOnce(91);
    prisma.subscriptionUsageMonthly.upsert.mockResolvedValueOnce({
      id: 'usage-cancelled-1',
    });

    const result = await getCurrentUsageByBusiness('biz-1');

    expect(result.subscriptionStatus).toBe('CANCELLED');
    expect(result.usage).toEqual({
      outlets: 2,
      users: 7,
      products: 180,
      monthlyTransactions: 91,
    });
    expect(result.remaining).toEqual({
      outlets: 8,
      users: 23,
      products: 19820,
      monthlyTransactions: 49909,
    });
  });

  it('returns invoice list and invoice detail for owner billing view', async () => {
    prisma.subscriptionInvoice.count.mockResolvedValueOnce(1);
    prisma.subscriptionInvoice.findMany.mockResolvedValueOnce([
      {
        id: 'invoice-1',
        invoiceNumber: 'SINV-202605-0001',
        subscriptionId: 'sub-1',
        billingPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
        billingPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
        subtotal: new Prisma.Decimal(299000),
        taxAmount: new Prisma.Decimal(0),
        totalAmount: new Prisma.Decimal(299000),
        status: 'ISSUED',
        dueDate: new Date('2026-05-31T23:59:59.999Z'),
        issuedAt: new Date('2026-05-24T10:00:00.000Z'),
        paidAt: null,
        voidedAt: null,
        createdAt: new Date('2026-05-24T10:00:00.000Z'),
        updatedAt: new Date('2026-05-24T10:00:00.000Z'),
        payments: [],
      },
    ]);
    prisma.subscriptionInvoice.findFirst.mockResolvedValueOnce({
      id: 'invoice-1',
      invoiceNumber: 'SINV-202605-0001',
      subscriptionId: 'sub-1',
      billingPeriodStart: new Date('2026-05-01T00:00:00.000Z'),
      billingPeriodEnd: new Date('2026-05-31T23:59:59.999Z'),
      subtotal: new Prisma.Decimal(299000),
      taxAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(299000),
      status: 'ISSUED',
      dueDate: new Date('2026-05-31T23:59:59.999Z'),
      issuedAt: new Date('2026-05-24T10:00:00.000Z'),
      paidAt: null,
      voidedAt: null,
      createdAt: new Date('2026-05-24T10:00:00.000Z'),
      updatedAt: new Date('2026-05-24T10:00:00.000Z'),
      payments: [
        {
          id: 'payment-1',
          method: 'TRANSFER',
          amount: new Prisma.Decimal(299000),
          status: 'PENDING',
          referenceNumber: 'SUB-REF-1',
          paidAt: null,
          createdAt: new Date('2026-05-24T10:00:00.000Z'),
          updatedAt: new Date('2026-05-24T10:00:00.000Z'),
        },
      ],
    });

    const listResult = await getSubscriptionInvoicesByBusiness({
      businessId: 'biz-1',
      page: 1,
      perPage: 10,
    });
    const detailResult = await getSubscriptionInvoiceDetailByBusiness({
      businessId: 'biz-1',
      invoiceId: 'invoice-1',
    });

    expect(listResult.meta.total).toBe(1);
    expect(listResult.items[0]?.invoiceNumber).toBe('SINV-202605-0001');
    expect(detailResult.payments[0]?.referenceNumber).toBe('SUB-REF-1');
  });

  it('returns change preview for immediate upgrade', async () => {
    const currentPlan = makePlan({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      monthlyPrice: 299000,
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
    });
    const targetPlan = makePlan({
      id: 'plan-business',
      code: 'BUSINESS',
      name: 'Business',
      monthlyPrice: 1299000,
      businessType: null,
      maxOutlets: 10,
      maxUsers: 30,
      maxProducts: 20000,
      maxMonthlyTransactions: 50000,
    });

    prisma.businessSubscription.findFirst.mockResolvedValue(makeSubscription(currentPlan));
    prisma.business.findUnique.mockResolvedValue({ businessType: 'RETAIL' });
    prisma.plan.findFirst.mockResolvedValueOnce(targetPlan);
    prisma.outlet.count.mockResolvedValueOnce(2);
    prisma.businessUser.count.mockResolvedValueOnce(6);
    prisma.product.count.mockResolvedValueOnce(120);
    prisma.payment.count.mockResolvedValueOnce(24);
    prisma.subscriptionUsageMonthly.upsert.mockResolvedValueOnce({ id: 'usage-1' });

    const result = await getSubscriptionChangePreviewByBusiness({
      businessId: 'biz-1',
      targetPlanCode: 'BUSINESS',
    });

    expect(result.changeType).toBe('UPGRADE');
    expect(result.isImmediate).toBe(true);
    expect(result.canProceed).toBe(true);
    expect(result.targetPlan.code).toBe('BUSINESS');
  });

  it('rejects downgrade when usage exceeds target plan limits', async () => {
    const currentPlan = makePlan({
      id: 'plan-business',
      code: 'BUSINESS',
      name: 'Business',
      monthlyPrice: 1299000,
      businessType: null,
      maxOutlets: 10,
      maxUsers: 30,
      maxProducts: 20000,
      maxMonthlyTransactions: 50000,
    });
    const targetPlan = makePlan({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      monthlyPrice: 299000,
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
    });

    prisma.businessSubscription.findFirst.mockResolvedValue(makeSubscription(currentPlan));
    prisma.business.findUnique.mockResolvedValue({ businessType: 'RETAIL' });
    prisma.plan.findFirst.mockResolvedValue(targetPlan);
    prisma.outlet.count.mockResolvedValueOnce(3);
    prisma.businessUser.count.mockResolvedValueOnce(9);
    prisma.product.count.mockResolvedValueOnce(600);
    prisma.payment.count.mockResolvedValueOnce(5100);
    prisma.subscriptionUsageMonthly.upsert.mockResolvedValueOnce({ id: 'usage-1' });

    await expect(
      changeSubscriptionPlanByBusiness({
        businessId: 'biz-1',
        targetPlanCode: 'BASIC',
      }),
    ).rejects.toMatchObject({
      statusCode: 409,
      errors: {
        violations: expect.arrayContaining([
          expect.objectContaining({
            metric: 'OUTLETS',
            targetLimit: 2,
            usage: 3,
          }),
        ]),
      },
    });
  });

  it('applies upgrade immediately and stores applied schedule change', async () => {
    const currentPlan = makePlan({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      monthlyPrice: 299000,
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
    });
    const targetPlan = makePlan({
      id: 'plan-retail-pro',
      code: 'RETAIL_PRO',
      name: 'Retail Pro',
      monthlyPrice: 499000,
      businessType: 'RETAIL',
      maxOutlets: 3,
      maxUsers: 12,
      maxProducts: 5000,
      maxMonthlyTransactions: 12000,
    });

    prisma.businessSubscription.findFirst.mockResolvedValue(makeSubscription(currentPlan));
    prisma.business.findUnique.mockResolvedValue({ businessType: 'RETAIL' });
    prisma.plan.findFirst.mockResolvedValue(targetPlan);
    prisma.outlet.count.mockResolvedValueOnce(2);
    prisma.businessUser.count.mockResolvedValueOnce(6);
    prisma.product.count.mockResolvedValueOnce(120);
    prisma.payment.count.mockResolvedValueOnce(24);
    prisma.subscriptionUsageMonthly.upsert.mockResolvedValueOnce({ id: 'usage-1' });

    const tx = {
      businessSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce(makeSubscription(currentPlan)),
        update: jest.fn().mockResolvedValueOnce({ id: 'sub-1' }),
      },
      plan: {
        findFirst: jest.fn().mockResolvedValueOnce(targetPlan),
      },
      subscriptionScheduleChange: {
        updateMany: jest.fn().mockResolvedValueOnce({ count: 0 }),
        create: jest.fn().mockResolvedValueOnce({
          id: 'change-1',
          status: 'APPLIED',
          effectiveAt: new Date('2026-05-20T10:00:00.000Z'),
        }),
      },
    };

    prisma.$transaction.mockImplementationOnce(
      async (callback: (args: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const result = await changeSubscriptionPlanByBusiness({
      businessId: 'biz-1',
      targetPlanCode: 'RETAIL_PRO',
    });

    expect(result.isImmediate).toBe(true);
    expect(result.changeType).toBe('UPGRADE');
    expect(result.scheduleChange?.status).toBe('APPLIED');
    expect(tx.businessSubscription.update).toHaveBeenCalledWith({
      where: {
        id: 'sub-1',
      },
      data: {
        planId: 'plan-retail-pro',
      },
    });
  });

  it('schedules subscription cancellation at period end', async () => {
    const currentPlan = makePlan({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      monthlyPrice: 299000,
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
    });

    prisma.businessSubscription.findFirst.mockResolvedValueOnce(makeSubscription(currentPlan));

    const tx = {
      businessSubscription: {
        update: jest.fn().mockResolvedValueOnce({ id: 'sub-1' }),
      },
      subscriptionScheduleChange: {
        updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
      },
    };

    prisma.$transaction.mockImplementationOnce(
      async (callback: (args: typeof tx) => Promise<unknown>) => callback(tx),
    );

    const result = await cancelSubscriptionByBusiness({
      businessId: 'biz-1',
    });

    expect(result.action).toBe('CANCEL_AT_PERIOD_END');
    expect(result.cancelAtPeriodEnd).toBe(true);
    expect(result.effectiveAt).toBe('2026-05-31T23:59:59.999Z');
    expect(tx.businessSubscription.update).toHaveBeenCalledWith({
      where: {
        id: 'sub-1',
      },
      data: {
        cancelAtPeriodEnd: true,
      },
    });
  });

  it('reactivates subscription by removing cancel-at-period-end flag', async () => {
    const currentPlan = makePlan({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      monthlyPrice: 299000,
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
    });

    prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      ...makeSubscription(currentPlan),
      cancelAtPeriodEnd: true,
    });
    prisma.businessSubscription.update.mockResolvedValueOnce({ id: 'sub-1' });

    const result = await reactivateSubscriptionByBusiness({
      businessId: 'biz-1',
    });

    expect(result.action).toBe('REACTIVATE');
    expect(result.cancelAtPeriodEnd).toBe(false);
    expect(prisma.businessSubscription.update).toHaveBeenCalledWith({
      where: {
        id: 'sub-1',
      },
      data: {
        cancelAtPeriodEnd: false,
      },
    });
  });

  it('starts a new subscription from cancelled state and issues initial invoice', async () => {
    const cancelledPlan = makePlan({
      id: 'plan-basic',
      code: 'BASIC',
      name: 'Basic',
      monthlyPrice: 299000,
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
    });
    const targetPlan = makePlan({
      id: 'plan-business',
      code: 'BUSINESS',
      name: 'Business',
      monthlyPrice: 1299000,
      businessType: null,
      maxOutlets: 10,
      maxUsers: 30,
      maxProducts: 20000,
      maxMonthlyTransactions: 50000,
    });

    prisma.businessSubscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        ...makeSubscription(cancelledPlan),
        status: 'CANCELLED',
        cancelledAt: new Date('2026-05-31T23:59:59.999Z'),
      });
    prisma.business.findUnique.mockResolvedValueOnce({ businessType: 'RETAIL' });
    prisma.plan.findFirst.mockResolvedValueOnce(targetPlan);

    const tx = {
      subscriptionScheduleChange: {
        updateMany: jest.fn().mockResolvedValueOnce({ count: 1 }),
      },
      businessSubscription: {
        create: jest.fn().mockResolvedValueOnce({
          id: 'sub-2',
          businessId: 'biz-1',
          planId: 'plan-business',
          status: 'ACTIVE',
          startedAt: new Date('2026-05-20T10:00:00.000Z'),
          currentPeriodStart: new Date('2026-05-20T10:00:00.000Z'),
          currentPeriodEnd: new Date('2026-06-20T09:59:59.999Z'),
          trialEndsAt: null,
          graceEndsAt: null,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
          suspendedAt: null,
          plan: targetPlan,
        }),
      },
      subscriptionInvoice: {
        findFirst: jest.fn().mockResolvedValueOnce(null),
        create: jest.fn().mockResolvedValueOnce({
          id: 'invoice-start-1',
          invoiceNumber: 'SINV-202605-0001',
          billingPeriodStart: new Date('2026-05-20T10:00:00.000Z'),
          billingPeriodEnd: new Date('2026-06-20T09:59:59.999Z'),
          dueDate: new Date('2026-06-20T09:59:59.999Z'),
          subtotal: new Prisma.Decimal(1299000),
          taxAmount: new Prisma.Decimal(0),
          totalAmount: new Prisma.Decimal(1299000),
          status: 'ISSUED',
        }),
      },
    };

    prisma.$transaction.mockImplementationOnce(
      async (
        callback: (args: {
          subscriptionScheduleChange: typeof tx.subscriptionScheduleChange;
          businessSubscription: typeof tx.businessSubscription;
          subscriptionInvoice: typeof tx.subscriptionInvoice;
        }) => Promise<unknown>,
      ) => callback(tx),
    );

    const result = await startSubscriptionByBusiness({
      businessId: 'biz-1',
      targetPlanCode: 'BUSINESS',
    });

    expect(result.status).toBe('ACTIVE');
    expect(result.plan.code).toBe('BUSINESS');
    expect(result.invoice.invoiceNumber).toBe('SINV-202605-0001');
    expect(tx.businessSubscription.create).toHaveBeenCalledWith({
      data: {
        businessId: 'biz-1',
        planId: 'plan-business',
        status: 'ACTIVE',
        startedAt: new Date('2026-05-20T10:00:00.000Z'),
        currentPeriodStart: new Date('2026-05-20T10:00:00.000Z'),
        currentPeriodEnd: new Date('2026-06-20T09:59:59.999Z'),
        trialEndsAt: null,
        graceEndsAt: null,
        cancelAtPeriodEnd: false,
        cancelledAt: null,
        suspendedAt: null,
      },
      include: {
        plan: true,
      },
    });
  });
});

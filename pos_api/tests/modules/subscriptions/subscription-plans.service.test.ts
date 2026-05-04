import { Prisma } from '@prisma/client';
import {
  createSubscriptionPlan,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  setSubscriptionPlanActiveStatus,
  updateSubscriptionPlan,
} from '../../../src/modules/subscriptions/subscriptions.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    plan: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('subscription plans admin service', () => {
  const { prisma } = jest.requireMock('../../../src/config/prisma');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns subscription plan list', async () => {
    prisma.plan.findMany.mockResolvedValueOnce([
      {
        id: 'plan-1',
        code: 'STARTER',
        name: 'Starter',
        description: 'Starter plan',
        monthlyPrice: 0,
        currencyCode: 'IDR',
        businessType: null,
        isCustomPricing: false,
        isActive: true,
        maxOutlets: 1,
        maxUsers: 2,
        maxProducts: 100,
        maxMonthlyTransactions: 1000,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      },
    ]);

    const result = await getSubscriptionPlans();

    expect(prisma.plan.findMany).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0].code).toBe('STARTER');
  });

  it('creates a new subscription plan', async () => {
    prisma.plan.findFirst.mockResolvedValueOnce(null);
    prisma.plan.create.mockResolvedValueOnce({
      id: 'plan-2',
      code: 'BASIC',
      name: 'Basic',
      description: 'Basic plan',
      monthlyPrice: new Prisma.Decimal(299000),
      currencyCode: 'IDR',
      businessType: null,
      isCustomPricing: false,
      isActive: true,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    const result = await createSubscriptionPlan({
      code: 'BASIC',
      name: 'Basic',
      description: 'Basic plan',
      monthlyPrice: 299000,
      currencyCode: 'IDR',
      businessType: null,
      maxOutlets: 2,
      maxUsers: 8,
      maxProducts: 500,
      maxMonthlyTransactions: 5000,
      isCustomPricing: false,
      isActive: true,
    });

    expect(prisma.plan.findFirst).toHaveBeenCalled();
    expect(prisma.plan.create).toHaveBeenCalled();
    expect(result.code).toBe('BASIC');
    expect(result.monthlyPrice).toBe(299000);
  });

  it('returns subscription plan by id', async () => {
    prisma.plan.findUnique.mockResolvedValueOnce({
      id: 'plan-3',
      code: 'RETAIL_PRO',
      name: 'Retail Pro',
      description: 'Retail plan',
      monthlyPrice: new Prisma.Decimal(499000),
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
    });

    const result = await getSubscriptionPlanById('plan-3');

    expect(prisma.plan.findUnique).toHaveBeenCalledWith({ where: { id: 'plan-3' } });
    expect(result.name).toBe('Retail Pro');
  });

  it('updates subscription plan', async () => {
    prisma.plan.findUnique.mockResolvedValueOnce({
      id: 'plan-4',
      code: 'BUSINESS',
      name: 'Business',
      description: 'Business plan',
      monthlyPrice: new Prisma.Decimal(1299000),
      currencyCode: 'IDR',
      businessType: null,
      isCustomPricing: false,
      isActive: true,
      maxOutlets: 10,
      maxUsers: 30,
      maxProducts: 20000,
      maxMonthlyTransactions: 50000,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    prisma.plan.update.mockResolvedValueOnce({
      id: 'plan-4',
      code: 'BUSINESS',
      name: 'Business Plus',
      description: 'Business plan improved',
      monthlyPrice: new Prisma.Decimal(1399000),
      currencyCode: 'IDR',
      businessType: null,
      isCustomPricing: false,
      isActive: true,
      maxOutlets: 12,
      maxUsers: 35,
      maxProducts: 25000,
      maxMonthlyTransactions: 60000,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-10T00:00:00.000Z'),
    });

    const result = await updateSubscriptionPlan({
      planId: 'plan-4',
      name: 'Business Plus',
      description: 'Business plan improved',
      monthlyPrice: 1399000,
      maxOutlets: 12,
      maxUsers: 35,
      maxProducts: 25000,
      maxMonthlyTransactions: 60000,
    });

    expect(prisma.plan.update).toHaveBeenCalled();
    expect(result.name).toBe('Business Plus');
    expect(result.monthlyPrice).toBe(1399000);
  });

  it('activates and deactivates subscription plan', async () => {
    prisma.plan.findUnique.mockResolvedValueOnce({
      id: 'plan-5',
      code: 'ENTREPRISE',
      name: 'Enterprise',
      description: 'Enterprise plan',
      monthlyPrice: new Prisma.Decimal(0),
      currencyCode: 'IDR',
      businessType: null,
      isCustomPricing: true,
      isActive: false,
      maxOutlets: null,
      maxUsers: null,
      maxProducts: null,
      maxMonthlyTransactions: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-01T00:00:00.000Z'),
    });
    prisma.plan.update.mockResolvedValueOnce({
      id: 'plan-5',
      code: 'ENTREPRISE',
      name: 'Enterprise',
      description: 'Enterprise plan',
      monthlyPrice: new Prisma.Decimal(0),
      currencyCode: 'IDR',
      businessType: null,
      isCustomPricing: true,
      isActive: true,
      maxOutlets: null,
      maxUsers: null,
      maxProducts: null,
      maxMonthlyTransactions: null,
      createdAt: new Date('2026-05-01T00:00:00.000Z'),
      updatedAt: new Date('2026-05-12T00:00:00.000Z'),
    });

    const result = await setSubscriptionPlanActiveStatus({
      planId: 'plan-5',
      isActive: true,
    });

    expect(prisma.plan.update).toHaveBeenCalledWith({
      where: { id: 'plan-5' },
      data: { isActive: true },
    });
    expect(result.isActive).toBe(true);
  });
});

import type { Request } from 'express';
import { SubscriptionStatus } from '@prisma/client';
import { requireSubscriptionWriteAccess } from '../../src/middlewares/subscription-write-access.middleware';
import { createMockRequest, createMockResponse, createNext } from '../helpers/express';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    businessSubscription: {
      findFirst: jest.fn(),
    },
  },
}));

type PrismaSubscriptionWriteAccessMock = {
  prisma: {
    businessSubscription: {
      findFirst: jest.Mock;
    };
  };
};

describe('subscriptionWriteAccessMiddleware', () => {
  const prismaMock = jest.requireMock('../../src/config/prisma') as PrismaSubscriptionWriteAccessMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 403 when business access context is missing', async () => {
    const middleware = requireSubscriptionWriteAccess('CREATE_ORDER');
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(403);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'Business access context belum tersedia',
      errors: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows write access when subscription is active', async () => {
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1',
      status: SubscriptionStatus.ACTIVE,
      graceEndsAt: null,
      suspendedAt: null,
      currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
      plan: {
        id: 'plan-1',
        code: 'BASIC',
        name: 'Basic',
      },
    });

    const middleware = requireSubscriptionWriteAccess('CREATE_PAYMENT');
    const req = createMockRequest({
      businessAccess: {
        businessId: 'biz-1',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(prismaMock.prisma.businessSubscription.findFirst).toHaveBeenCalledWith({
      where: {
        businessId: 'biz-1',
        status: {
          in: [
            SubscriptionStatus.TRIAL,
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.SUSPENDED,
            SubscriptionStatus.CANCELLED,
          ],
        },
      },
      include: {
        plan: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: [
        {
          currentPeriodEnd: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
    });
    expect(resp.statusCode).toBe(200);
    expect(next).toHaveBeenCalled();
  });

  it('allows write access when no subscription record is found to avoid breaking legacy business flow', async () => {
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValueOnce(null);

    const middleware = requireSubscriptionWriteAccess('CREATE_PRODUCT');
    const req = createMockRequest({
      businessAccess: {
        businessId: 'biz-legacy-1',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(200);
    expect(next).toHaveBeenCalled();
  });

  it('blocks write access when subscription is suspended', async () => {
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-2',
      status: SubscriptionStatus.SUSPENDED,
      graceEndsAt: new Date('2026-06-07T23:59:59.999Z'),
      suspendedAt: new Date('2026-06-08T10:00:00.000Z'),
      currentPeriodEnd: new Date('2026-06-30T23:59:59.999Z'),
      plan: {
        id: 'plan-2',
        code: 'BUSINESS',
        name: 'Business',
      },
    });

    const middleware = requireSubscriptionWriteAccess('CREATE_ORDER');
    const req = createMockRequest({
      businessAccess: {
        businessId: 'biz-2',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(403);
    expect(resp.jsonBody).toEqual({
      success: false,
      message:
        'Subscription business ini sedang suspended. Akses write diblokir sampai invoice subscription diselesaikan.',
      errors: {
        code: 'SUBSCRIPTION_WRITE_BLOCKED',
        blockedAction: 'CREATE_ORDER',
        plan: {
          id: 'plan-2',
          code: 'BUSINESS',
          name: 'Business',
        },
        subscription: {
          id: 'sub-2',
          status: SubscriptionStatus.SUSPENDED,
          currentPeriodEnd: '2026-06-30T23:59:59.999Z',
          graceEndsAt: '2026-06-07T23:59:59.999Z',
          suspendedAt: '2026-06-08T10:00:00.000Z',
        },
        suggestion:
          'Buka halaman billing subscription dan catat pembayaran invoice overdue untuk mengaktifkan kembali akses write.',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});

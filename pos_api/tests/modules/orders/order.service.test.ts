import { BusinessType } from '@prisma/client';
import { createOrder } from '../../../src/modules/orders/order.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

type OrderTransactionMock = {
  outlet: {
    findFirst: jest.Mock;
  };
  businessUser: {
    findFirst: jest.Mock;
  };
  outletTable: {
    findFirst: jest.Mock;
  };
  businessSubscription: {
    findFirst: jest.Mock;
  };
  payment: {
    count: jest.Mock;
  };
  order: {
    findFirst: jest.Mock;
    create: jest.Mock;
  };
};

type OrderPrismaMock = {
  prisma: {
    $transaction: jest.Mock;
  };
};

describe('order.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as OrderPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('blocks create order when monthly transaction limit is reached', async () => {
    const tx: OrderTransactionMock = {
      outlet: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'outlet-1',
          businessId: 'biz-1',
          name: 'Outlet 1',
          address: 'Jl. Test',
          business: {
            id: 'biz-1',
            name: 'Demo',
            businessType: BusinessType.RETAIL,
          },
        }),
      },
      businessUser: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'bu-1',
        }),
      },
      outletTable: {
        findFirst: jest.fn(),
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
            maxMonthlyTransactions: 10,
          },
        }),
      },
      payment: {
        count: jest.fn().mockResolvedValueOnce(10),
      },
      order: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };

    prismaMock.prisma.$transaction.mockImplementationOnce(
      async (callback: (reader: OrderTransactionMock) => Promise<unknown>) => callback(tx),
    );

    await expect(
      createOrder({
        businessId: 'biz-1',
        outletId: 'outlet-1',
        businessUserId: 'bu-1',
        notes: 'order baru',
        items: [],
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errors: {
        blockedAction: 'CREATE_ORDER',
        limit: 10,
        usage: 10,
      },
    });

    expect(tx.order.create).not.toHaveBeenCalled();
  });
});

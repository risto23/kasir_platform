import { BusinessRoleCode, BusinessUserStatus } from '@prisma/client';
import {
  createBusinessUser,
  updateBusinessUserStatus,
} from '../../../src/modules/business-users/business-users.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn(),
}));

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    businessSubscription: {
      findFirst: jest.fn(),
    },
    businessUser: {
      findFirst: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  },
}));

type BusinessUsersTransactionMock = {
  outlet: {
    findMany: jest.Mock;
  };
  businessSubscription: {
    findFirst: jest.Mock;
  };
  businessUser: {
    count: jest.Mock;
  };
};

type BusinessUsersPrismaMock = {
  prisma: {
    $transaction: jest.Mock;
    businessSubscription: {
      findFirst: jest.Mock;
    };
    businessUser: {
      findFirst: jest.Mock;
      count: jest.Mock;
      update: jest.Mock;
    };
  };
};

describe('business-users.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as BusinessUsersPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('blocks create active business user when user limit is reached', async () => {
    const tx: BusinessUsersTransactionMock = {
      outlet: {
        findMany: jest.fn().mockResolvedValueOnce([]),
      },
      businessSubscription: {
        findFirst: jest.fn().mockResolvedValueOnce({
          id: 'sub-1',
          status: 'TRIAL',
          plan: {
            id: 'plan-1',
            code: 'BASIC',
            name: 'Basic',
            maxOutlets: 2,
            maxUsers: 2,
            maxProducts: 100,
            maxMonthlyTransactions: 500,
          },
        }),
      },
      businessUser: {
        count: jest.fn().mockResolvedValueOnce(2),
      },
    };

    prismaMock.prisma.$transaction.mockImplementationOnce(
      async (callback: (reader: BusinessUsersTransactionMock) => Promise<unknown>) => callback(tx),
    );

    await expect(
      createBusinessUser('biz-1', {
        fullName: 'Kasir Baru',
        email: 'kasir-baru@demo.local',
        password: 'password123',
        businessRoleCode: BusinessRoleCode.ADMIN,
        hasAllOutletAccess: true,
        outletIds: [],
        status: BusinessUserStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errors: {
        plan: {
          code: 'BASIC',
        },
        limit: 2,
        usage: 2,
        blockedAction: 'CREATE_BUSINESS_USER',
      },
    });
  });

  it('blocks re-activating business user when user limit is reached', async () => {
    prismaMock.prisma.businessUser.findFirst.mockResolvedValueOnce({
      id: 'bu-1',
      businessId: 'biz-1',
      isPrimary: false,
      status: BusinessUserStatus.INACTIVE,
    });
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'PAST_DUE',
      plan: {
        id: 'plan-1',
        code: 'BASIC',
        name: 'Basic',
        maxOutlets: 2,
        maxUsers: 2,
        maxProducts: 100,
        maxMonthlyTransactions: 500,
      },
    });
    prismaMock.prisma.businessUser.count.mockResolvedValueOnce(2);

    await expect(
      updateBusinessUserStatus('biz-1', 'bu-1', {
        status: BusinessUserStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errors: {
        blockedAction: 'ACTIVATE_BUSINESS_USER',
        limit: 2,
        usage: 2,
      },
    });

    expect(prismaMock.prisma.businessUser.update).not.toHaveBeenCalled();
  });
});

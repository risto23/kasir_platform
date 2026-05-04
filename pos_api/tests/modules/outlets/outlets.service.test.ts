import { OutletStatus } from '@prisma/client';
import { createOutlet } from '../../../src/modules/outlets/outlets.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    businessSubscription: {
      findFirst: jest.fn(),
    },
    outlet: {
      count: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

type OutletsPrismaMock = {
  prisma: {
    businessSubscription: {
      findFirst: jest.Mock;
    };
    outlet: {
      count: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
};

describe('outlets.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as OutletsPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('blocks create outlet when active outlet limit is reached', async () => {
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'ACTIVE',
      plan: {
        id: 'plan-1',
        code: 'BASIC',
        name: 'Basic',
        maxOutlets: 2,
        maxUsers: 10,
        maxProducts: 100,
        maxMonthlyTransactions: 500,
      },
    });
    prismaMock.prisma.outlet.count.mockResolvedValueOnce(2);

    await expect(
      createOutlet('biz-1', {
        name: 'Outlet Ketiga',
        address: null,
        phone: null,
        status: OutletStatus.ACTIVE,
      }),
    ).rejects.toMatchObject({
      message: 'Paket Basic sudah mencapai batas outlet aktif. Upgrade paket untuk melanjutkan aksi ini.',
      statusCode: 403,
      errors: {
        plan: {
          code: 'BASIC',
          name: 'Basic',
        },
        limit: 2,
        usage: 2,
        blockedAction: 'CREATE_OUTLET',
        suggestion: 'Upgrade paket aktif untuk menambah limit outlet.',
      },
    });

    expect(prismaMock.prisma.outlet.create).not.toHaveBeenCalled();
  });
});

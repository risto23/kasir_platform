import {
  createBusinessService,
  getBusinessByIdService,
  listBusinessesService,
  updateBusinessService,
  updateBusinessStatusService,
} from '../../../src/modules/platform-business/platform-business.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    business: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    featureFlag: {
      findMany: jest.fn(),
    },
    businessFeatureFlag: {
      create: jest.fn(),
    },
  },
}));

type PlatformBusinessPrismaMock = {
  prisma: {
    business: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    featureFlag: {
      findMany: jest.Mock;
    };
    businessFeatureFlag: {
      create: jest.Mock;
    };
  };
};

describe('platform-business.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as PlatformBusinessPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('lists businesses ordered by newest first', async () => {
    prismaMock.prisma.business.findMany.mockResolvedValueOnce([{ id: 'biz-1' }]);

    const result = await listBusinessesService();

    expect(result).toEqual([{ id: 'biz-1' }]);
    expect(prismaMock.prisma.business.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          createdAt: 'desc',
        },
      }),
    );
  });

  it('throws when business detail is not found', async () => {
    prismaMock.prisma.business.findUnique.mockResolvedValueOnce(null);

    await expect(getBusinessByIdService('biz-404')).rejects.toThrow('Business tidak ditemukan');
  });

  it('creates business and enables selected feature flags', async () => {
    prismaMock.prisma.business.create.mockResolvedValueOnce({ id: 'biz-1' });
    prismaMock.prisma.featureFlag.findMany.mockResolvedValueOnce([
      { id: 'flag-1', key: 'GUEST_QR' },
      { id: 'flag-2', key: 'POS_TABLE' },
    ]);
    prismaMock.prisma.businessFeatureFlag.create
      .mockResolvedValueOnce({ id: 'map-1' })
      .mockResolvedValueOnce({ id: 'map-2' });
    prismaMock.prisma.business.findUnique.mockResolvedValueOnce({
      id: 'biz-1',
      name: 'Biz 1',
    });

    const result = await createBusinessService({
      name: 'Biz 1',
      slug: 'biz-1',
      businessType: 'RETAIL',
      ownerUserId: 'user-1',
      featureFlagKeys: ['GUEST_QR', 'POS_TABLE'],
    });

    expect(prismaMock.prisma.business.create).toHaveBeenCalled();
    expect(prismaMock.prisma.businessFeatureFlag.create).toHaveBeenCalledTimes(2);
    expect(result).toEqual({
      id: 'biz-1',
      name: 'Biz 1',
    });
  });

  it('throws when updating business that does not exist', async () => {
    prismaMock.prisma.business.findUnique.mockResolvedValueOnce(null);

    await expect(
      updateBusinessService('biz-404', {
        name: 'New Name',
        slug: 'new-name',
        ownerUserId: null,
      }),
    ).rejects.toThrow('Business tidak ditemukan');
  });

  it('updates business and returns refreshed detail', async () => {
    prismaMock.prisma.business.findUnique
      .mockResolvedValueOnce({ id: 'biz-1' })
      .mockResolvedValueOnce({ id: 'biz-1', name: 'Updated Biz' });
    prismaMock.prisma.business.update.mockResolvedValueOnce({ id: 'biz-1' });

    const result = await updateBusinessService('biz-1', {
      name: 'Updated Biz',
      slug: 'updated-biz',
      ownerUserId: 'owner-2',
    });

    expect(prismaMock.prisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'biz-1' },
      }),
    );
    expect(result).toEqual({
      id: 'biz-1',
      name: 'Updated Biz',
    });
  });

  it('updates business status and returns refreshed detail', async () => {
    prismaMock.prisma.business.findUnique
      .mockResolvedValueOnce({ id: 'biz-1' })
      .mockResolvedValueOnce({ id: 'biz-1', status: 'INACTIVE' });
    prismaMock.prisma.business.update.mockResolvedValueOnce({ id: 'biz-1' });

    const result = await updateBusinessStatusService('biz-1', 'INACTIVE');

    expect(prismaMock.prisma.business.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'INACTIVE' },
      }),
    );
    expect(result).toEqual({
      id: 'biz-1',
      status: 'INACTIVE',
    });
  });
});

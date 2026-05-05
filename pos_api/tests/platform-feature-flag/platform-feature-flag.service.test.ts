import {
  getEffectiveBusinessFeatureFlagState,
  overrideBusinessFeatureFlagService,
} from '../../src/modules/platform-feature-flag/platform-feature-flag.service';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    featureFlag: {
      findUnique: jest.fn(),
    },
    businessFeatureFlag: {
      findUnique: jest.fn(),
    },
    businessFeatureFlagOverride: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
    },
    business: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../src/utils/audit-log', () => ({
  createAuditLogSafely: jest.fn(),
}));

type PrismaModuleMock = {
  prisma: {
    featureFlag: {
      findUnique: jest.Mock;
    };
    businessFeatureFlag: {
      findUnique: jest.Mock;
    };
    businessFeatureFlagOverride: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
      delete: jest.Mock;
    };
    business: {
      findUnique: jest.Mock;
    };
  };
};

type AuditLogModuleMock = {
  createAuditLogSafely: jest.Mock;
};

describe('platform-feature-flag.service', () => {
  const prismaMock = jest.requireMock('../../src/config/prisma') as PrismaModuleMock;
  const auditLogMock = jest.requireMock('../../src/utils/audit-log') as AuditLogModuleMock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns effective enabled state from override when override exists', async () => {
    prismaMock.prisma.featureFlag.findUnique.mockResolvedValueOnce({
      id: 'flag-1',
      key: 'REPORT_ORDERS',
      name: 'Report Orders',
      description: null,
    });
    prismaMock.prisma.businessFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: false });
    prismaMock.prisma.businessFeatureFlagOverride.findUnique.mockResolvedValueOnce({
      enabled: true,
      reason: 'manual enable',
    });

    const result = await getEffectiveBusinessFeatureFlagState('biz-1', 'REPORT_ORDERS');

    expect(result).toEqual({
      id: 'flag-1',
      key: 'REPORT_ORDERS',
      name: 'Report Orders',
      description: null,
      enabled: true,
      planEnabled: false,
      overrideEnabled: true,
      overrideReason: 'manual enable',
      source: 'OVERRIDE',
    });
  });

  it('removes override row when requested state matches plan state', async () => {
    prismaMock.prisma.business.findUnique.mockResolvedValueOnce({
      id: 'biz-1',
      name: 'Demo Business',
    });
    prismaMock.prisma.featureFlag.findUnique.mockResolvedValueOnce({
      id: 'flag-1',
      key: 'REPORT_ORDERS',
      name: 'Report Orders',
      description: null,
    });
    prismaMock.prisma.businessFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: true });
    prismaMock.prisma.businessFeatureFlagOverride.findUnique.mockResolvedValueOnce({
      enabled: false,
      reason: 'manual disable',
    });

    const result = await overrideBusinessFeatureFlagService(
      'biz-1',
      'REPORT_ORDERS',
      true,
      'back to plan',
      'actor-1'
    );

    expect(prismaMock.prisma.businessFeatureFlagOverride.delete).toHaveBeenCalledWith({
      where: {
        businessId_featureFlagId: {
          businessId: 'biz-1',
          featureFlagId: 'flag-1',
        },
      },
    });
    expect(prismaMock.prisma.businessFeatureFlagOverride.upsert).not.toHaveBeenCalled();
    expect(auditLogMock.createAuditLogSafely).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: 'biz-1',
        actorUserId: 'actor-1',
        metadata: expect.objectContaining({
          operation: 'REMOVE',
          featureFlagKey: 'REPORT_ORDERS',
        }),
      })
    );
    expect(result).toEqual({
      business: { id: 'biz-1', name: 'Demo Business' },
      flag: { id: 'flag-1', key: 'REPORT_ORDERS', name: 'Report Orders' },
      enabled: true,
      reason: null,
      planEnabled: true,
      overrideEnabled: null,
      overrideReason: null,
      source: 'PLAN',
    });
  });
});

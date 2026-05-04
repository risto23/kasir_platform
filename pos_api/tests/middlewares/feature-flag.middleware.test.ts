import type { Request } from 'express';
import {
  requireFeatureFlag,
  requireFeatureFlagForOutletParam,
} from '../../src/middlewares/require-feature-flag.middleware';
import { createMockRequest, createMockResponse, createNext } from '../helpers/express';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    featureFlag: {
      findUnique: jest.fn(),
    },
    businessFeatureFlag: {
      findUnique: jest.fn(),
    },
    outlet: {
      findUnique: jest.fn(),
    },
  },
}));

type PrismaFeatureFlagMock = {
  prisma: {
    featureFlag: {
      findUnique: jest.Mock;
    };
    businessFeatureFlag: {
      findUnique: jest.Mock;
    };
    outlet: {
      findUnique: jest.Mock;
    };
  };
};

describe('requireFeatureFlag middleware', () => {
  const prismaMock = jest.requireMock('../../src/config/prisma') as PrismaFeatureFlagMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 400 when business context is missing', async () => {
    const middleware = requireFeatureFlag('GUEST_QR');
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when feature flag is disabled', async () => {
    prismaMock.prisma.featureFlag.findUnique.mockResolvedValueOnce({ id: 'flag-1' });
    prismaMock.prisma.businessFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: false });

    const middleware = requireFeatureFlag('GUEST_QR');
    const req = createMockRequest({
      businessAccess: {
        businessId: 'biz-1',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when feature flag is enabled', async () => {
    prismaMock.prisma.featureFlag.findUnique.mockResolvedValueOnce({ id: 'flag-1' });
    prismaMock.prisma.businessFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: true });

    const middleware = requireFeatureFlag('GUEST_QR');
    const req = createMockRequest({
      businessAccess: {
        businessId: 'biz-1',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect(resp.status).not.toHaveBeenCalled();
  });

  it('returns 500 when prisma throws', async () => {
    prismaMock.prisma.featureFlag.findUnique.mockRejectedValueOnce(new Error('boom'));

    const middleware = requireFeatureFlag('GUEST_QR');
    const req = createMockRequest({
      businessAccess: {
        businessId: 'biz-1',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(500);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'boom',
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe('requireFeatureFlagForOutletParam middleware', () => {
  const prismaMock = jest.requireMock('../../src/config/prisma') as PrismaFeatureFlagMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 400 when outlet id cannot be resolved', async () => {
    const middleware = requireFeatureFlagForOutletParam('GUEST_QR', () => null);
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 404 when outlet is not found', async () => {
    prismaMock.prisma.outlet.findUnique.mockResolvedValueOnce(null);

    const middleware = requireFeatureFlagForOutletParam('GUEST_QR', () => 'outlet-1');
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when business feature flag is disabled', async () => {
    prismaMock.prisma.outlet.findUnique.mockResolvedValueOnce({ businessId: 'biz-1' });
    prismaMock.prisma.featureFlag.findUnique.mockResolvedValueOnce({ id: 'flag-1' });
    prismaMock.prisma.businessFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: false });

    const middleware = requireFeatureFlagForOutletParam('GUEST_QR', () => 'outlet-1');
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when outlet-level guest qr is disabled', async () => {
    prismaMock.prisma.outlet.findUnique
      .mockResolvedValueOnce({ businessId: 'biz-1' })
      .mockResolvedValueOnce({
        setting: {
          guestQrEnabled: false,
        },
      });
    prismaMock.prisma.featureFlag.findUnique.mockResolvedValueOnce({ id: 'flag-1' });
    prismaMock.prisma.businessFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: true });

    const middleware = requireFeatureFlagForOutletParam('GUEST_QR', () => 'outlet-1');
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(resp.statusCode).toBe(403);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'GUEST_QR belum aktif untuk outlet ini',
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when outlet feature is enabled', async () => {
    prismaMock.prisma.outlet.findUnique
      .mockResolvedValueOnce({ businessId: 'biz-1' })
      .mockResolvedValueOnce({
        setting: {
          guestQrEnabled: true,
        },
      });
    prismaMock.prisma.featureFlag.findUnique.mockResolvedValueOnce({ id: 'flag-1' });
    prismaMock.prisma.businessFeatureFlag.findUnique.mockResolvedValueOnce({ enabled: true });

    const middleware = requireFeatureFlagForOutletParam('GUEST_QR', () => 'outlet-1');
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await middleware(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect(resp.status).not.toHaveBeenCalled();
  });
});

import type { Request } from 'express';
import { businessAccessMiddleware } from '../../src/middlewares/business-access.middleware';
import { createMockRequest, createMockResponse, createNext } from '../helpers/express';

jest.mock('../../src/config/prisma', () => ({
  prisma: {
    business: {
      findFirst: jest.fn(),
    },
    businessUser: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../../src/modules/auth/auth.service', () => ({
  getUserPlatformRoleCodes: jest.fn(),
}));

jest.mock('../../src/modules/auth/auth.mapper', () => ({
  mapBusinessMembership: jest.fn(),
}));

type PrismaBusinessAccessMock = {
  prisma: {
    business: {
      findFirst: jest.Mock;
    };
    businessUser: {
      findMany: jest.Mock;
    };
  };
};

type AuthServiceMock = {
  getUserPlatformRoleCodes: jest.Mock;
};

type AuthMapperMock = {
  mapBusinessMembership: jest.Mock;
};

describe('businessAccessMiddleware', () => {
  const prismaMock = jest.requireMock('../../src/config/prisma') as PrismaBusinessAccessMock;
  const authServiceMock = jest.requireMock('../../src/modules/auth/auth.service') as AuthServiceMock;
  const authMapperMock = jest.requireMock('../../src/modules/auth/auth.mapper') as AuthMapperMock;

  beforeEach(() => {
    jest.resetAllMocks();
    authMapperMock.mapBusinessMembership.mockReturnValue({
      businessId: 'biz-1',
      businessUserId: 'membership-1',
    });
  });

  it('returns 401 when auth user is missing', async () => {
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await businessAccessMiddleware(req, resp.res, next);

    expect(resp.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('uses requested membership when user has direct access', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockResolvedValueOnce([]);
    prismaMock.prisma.businessUser.findMany.mockResolvedValueOnce([
      {
        businessId: 'biz-1',
        isPrimary: false,
      },
    ]);

    const req = createMockRequest({
      authUser: { userId: 'user-1' },
      headers: { 'x-business-id': 'biz-1' },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await businessAccessMiddleware(req, resp.res, next);

    expect(authMapperMock.mapBusinessMembership).toHaveBeenCalledWith({
      businessId: 'biz-1',
      isPrimary: false,
    });
    expect(req.businessAccess).toEqual({
      businessId: 'biz-1',
      businessUserId: 'membership-1',
    });
    expect(next).toHaveBeenCalled();
  });

  it('builds super admin access when requested business exists', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockResolvedValueOnce(['SUPER_ADMIN']);
    prismaMock.prisma.businessUser.findMany.mockResolvedValueOnce([]);
    prismaMock.prisma.business.findFirst.mockResolvedValueOnce({
      id: 'biz-2',
      name: 'Business 2',
      businessType: 'RETAIL',
      outlets: [{ id: 'outlet-1', status: 'ACTIVE' }],
    });

    const req = createMockRequest({
      authUser: { userId: 'user-1' },
      headers: { 'x-business-id': 'biz-2' },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await businessAccessMiddleware(req, resp.res, next);

    expect(req.businessAccess?.businessId).toBe('biz-2');
    expect(req.businessAccess?.hasAllOutletAccess).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('returns 403 when user has no access to requested business', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockResolvedValueOnce([]);
    prismaMock.prisma.businessUser.findMany.mockResolvedValueOnce([]);

    const req = createMockRequest({
      authUser: { userId: 'user-1' },
      headers: { 'x-business-id': 'biz-9' },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await businessAccessMiddleware(req, resp.res, next);

    expect(resp.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('uses primary membership when business header is not provided', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockResolvedValueOnce([]);
    prismaMock.prisma.businessUser.findMany.mockResolvedValueOnce([
      { businessId: 'biz-1', isPrimary: false },
      { businessId: 'biz-2', isPrimary: true },
    ]);
    authMapperMock.mapBusinessMembership.mockReturnValueOnce({
      businessId: 'biz-2',
      businessUserId: 'membership-2',
    });

    const req = createMockRequest({
      authUser: { userId: 'user-1' },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await businessAccessMiddleware(req, resp.res, next);

    expect(req.businessAccess).toEqual({
      businessId: 'biz-2',
      businessUserId: 'membership-2',
    });
    expect(next).toHaveBeenCalled();
  });

  it('returns 400 when super admin has no selected business', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockResolvedValueOnce(['SUPER_ADMIN']);
    prismaMock.prisma.businessUser.findMany.mockResolvedValueOnce([]);

    const req = createMockRequest({
      authUser: { userId: 'user-1' },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await businessAccessMiddleware(req, resp.res, next);

    expect(resp.statusCode).toBe(400);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 500 when lookup throws', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockRejectedValueOnce(new Error('lookup failed'));

    const req = createMockRequest({
      authUser: { userId: 'user-1' },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await businessAccessMiddleware(req, resp.res, next);

    expect(resp.statusCode).toBe(500);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'lookup failed',
      errors: null,
    });
    expect(next).not.toHaveBeenCalled();
  });
});

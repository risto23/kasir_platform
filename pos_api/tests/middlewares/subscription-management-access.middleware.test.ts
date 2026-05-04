import type { Request } from 'express';
import { requireSubscriptionManagementAccess } from '../../src/middlewares/subscription-management-access.middleware';
import { createMockRequest, createMockResponse, createNext } from '../helpers/express';

jest.mock('../../src/modules/auth/auth.service', () => ({
  getUserPlatformRoleCodes: jest.fn(),
}));

type AuthServiceMock = {
  getUserPlatformRoleCodes: jest.Mock;
};

describe('requireSubscriptionManagementAccess', () => {
  const authServiceMock = jest.requireMock(
    '../../src/modules/auth/auth.service',
  ) as AuthServiceMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns 401 when auth user is missing', async () => {
    const req = createMockRequest() as Request;
    const resp = createMockResponse();
    const next = createNext();

    await requireSubscriptionManagementAccess(req, resp.res, next);

    expect(resp.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for business owner without super admin role', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockResolvedValueOnce([]);

    const req = createMockRequest({
      authUser: {
        userId: 'user-owner-1',
        email: 'owner@demo.local',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await requireSubscriptionManagementAccess(req, resp.res, next);

    expect(resp.statusCode).toBe(403);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'Hanya super admin yang dapat memilih atau mengubah plan subscription',
      errors: null,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('allows super admin to manage subscription plan actions', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockResolvedValueOnce(['SUPER_ADMIN']);

    const req = createMockRequest({
      authUser: {
        userId: 'user-super-admin-1',
        email: 'superadmin@pos.local',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await requireSubscriptionManagementAccess(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect(resp.statusCode).toBe(200);
  });

  it('returns 500 when role lookup fails', async () => {
    authServiceMock.getUserPlatformRoleCodes.mockRejectedValueOnce(
      new Error('role lookup failed'),
    );

    const req = createMockRequest({
      authUser: {
        userId: 'user-super-admin-1',
        email: 'superadmin@pos.local',
      },
    }) as Request;
    const resp = createMockResponse();
    const next = createNext();

    await requireSubscriptionManagementAccess(req, resp.res, next);

    expect(resp.statusCode).toBe(500);
    expect(resp.jsonBody).toEqual({
      success: false,
      message: 'role lookup failed',
      errors: null,
    });
    expect(next).not.toHaveBeenCalled();
  });
});

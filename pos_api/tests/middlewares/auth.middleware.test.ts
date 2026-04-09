import { authMiddleware } from '../../src/middlewares/auth.middleware';
import { createMockRequest, createMockResponse, createNext } from '../helpers/express';

jest.mock('../../src/utils/jwt', () => ({
  verifyAccessToken: jest.fn((token: string) => {
    if (token === 'valid') return { userId: 'u1', email: 'u1@x.local' };
    throw new Error('bad');
  }),
}));

describe('authMiddleware', () => {
  it('returns 401 when no bearer token', () => {
    const req = createMockRequest({ headers: {} as any });
    const resp = createMockResponse();
    const next = createNext();

    authMiddleware(req, resp.res, next);

    expect(resp.status).toHaveBeenCalledWith(401);
    expect(resp.statusCode).toBe(401);
    expect(resp.json).toHaveBeenCalled();
    expect((resp.jsonBody as any).success).toBe(false);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token invalid', () => {
    const req = createMockRequest({ headers: { authorization: 'Bearer invalid' } as any });
    const resp = createMockResponse();
    const next = createNext();

    authMiddleware(req, resp.res, next);

    expect(resp.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and sets req.authUser for valid token', () => {
    const req = createMockRequest({ headers: { authorization: 'Bearer valid' } as any });
    const resp = createMockResponse();
    const next = createNext();

    authMiddleware(req, resp.res, next);

    expect(next).toHaveBeenCalled();
    expect((req as any).authUser).toEqual({ userId: 'u1', email: 'u1@x.local' });
  });
});

import type { Request, Response } from 'express';
import {
  loginController,
  logoutController,
  meController,
} from '../../../src/modules/auth/auth.controller';

jest.mock('../../../src/modules/auth/auth.service', () => ({
  loginService: jest.fn(),
  meService: jest.fn(),
}));

jest.mock('../../../src/utils/auth-cookie', () => ({
  clearAuthCookie: jest.fn(),
  setAuthCookie: jest.fn(),
}));

type AuthServiceControllerMock = {
  loginService: jest.Mock;
  meService: jest.Mock;
};

type AuthCookieMock = {
  clearAuthCookie: jest.Mock;
  setAuthCookie: jest.Mock;
};

function createResponse() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return res;
}

describe('auth.controller', () => {
  const authServiceMock = jest.requireMock('../../../src/modules/auth/auth.service') as AuthServiceControllerMock;
  const authCookieMock = jest.requireMock('../../../src/utils/auth-cookie') as AuthCookieMock;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('sets auth cookie and returns success on login', async () => {
    authServiceMock.loginService.mockResolvedValueOnce({
      accessToken: 'token-1',
      user: {
        id: 'user-1',
      },
    });

    const req = {
      body: {
        email: 'owner@example.com',
        password: 'secret',
      },
    } as Request;
    const res = createResponse();

    await loginController(req, res);

    expect(authCookieMock.setAuthCookie).toHaveBeenCalledWith(res, 'token-1');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Login berhasil',
      data: {
        accessToken: 'token-1',
        user: {
          id: 'user-1',
        },
      },
    });
  });

  it('returns 401 when login fails', async () => {
    authServiceMock.loginService.mockRejectedValueOnce(new Error('Email atau password salah'));

    const req = {
      body: {
        email: 'owner@example.com',
        password: 'wrong',
      },
    } as Request;
    const res = createResponse();

    await loginController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Email atau password salah',
      errors: null,
    });
  });

  it('returns 401 on me when auth user is missing', async () => {
    const req = {} as Request;
    const res = createResponse();

    await meController(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Unauthorized',
      errors: null,
    });
  });

  it('returns current user on me success', async () => {
    authServiceMock.meService.mockResolvedValueOnce({
      id: 'user-1',
      email: 'owner@example.com',
    });

    const req = {
      authUser: {
        userId: 'user-1',
      },
    } as Request;
    const res = createResponse();

    await meController(req, res);

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Current user fetched',
      data: {
        id: 'user-1',
        email: 'owner@example.com',
      },
    });
  });

  it('returns 404 on me service failure', async () => {
    authServiceMock.meService.mockRejectedValueOnce(new Error('User tidak ditemukan'));

    const req = {
      authUser: {
        userId: 'user-1',
      },
    } as Request;
    const res = createResponse();

    await meController(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'User tidak ditemukan',
      errors: null,
    });
  });

  it('clears auth cookie on logout', async () => {
    const res = createResponse();

    await logoutController({} as Request, res);

    expect(authCookieMock.clearAuthCookie).toHaveBeenCalledWith(res);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Logout berhasil',
      data: null,
    });
  });
});

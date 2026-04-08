import { loginService } from '../../../src/modules/auth/auth.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('../../../src/utils/password', () => ({
  comparePassword: jest.fn(),
}));

jest.mock('../../../src/modules/auth/auth.mapper', () => ({
  buildAccessProfile: jest.fn(() => ({ roles: [] })),
  mapBusinessMemberships: jest.fn(() => ([])),
}));

describe('loginService (mocked DB)', () => {
  const { prisma } = jest.requireMock('../../../src/config/prisma');
  const { comparePassword } = jest.requireMock('../../../src/utils/password');

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('throws when user not found', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(null);

    await expect(loginService('x@y.z', 'pw')).rejects.toThrow('Email atau password salah');
  });

  it('throws when user inactive', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ status: 'INACTIVE' });

    await expect(loginService('x@y.z', 'pw')).rejects.toThrow('User tidak aktif');
  });

  it('throws when password invalid', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'u1', email: 'x@y.z', status: 'ACTIVE', passwordHash: 'h' });
    comparePassword.mockResolvedValueOnce(false);

    await expect(loginService('x@y.z', 'pw')).rejects.toThrow('Email atau password salah');
  });

  it('returns token and mapped user on success', async () => {
    const user = { id: 'u1', email: 'x@y.z', fullName: 'U One', status: 'ACTIVE', passwordHash: 'h' };
    prisma.user.findUnique
      .mockResolvedValueOnce(user) // by email
      .mockResolvedValueOnce({ // by id (refreshed)
        ...user,
        lastLoginAt: new Date(),
        platformRoles: [{ platformRole: { code: 'SUPER_ADMIN' } }],
        businessUsers: [],
      });
    comparePassword.mockResolvedValueOnce(true);
    prisma.user.update.mockResolvedValueOnce({});

    const result = await loginService('x@y.z', 'pw');

    expect(typeof result.accessToken).toBe('string');
    expect(result.user.email).toBe('x@y.z');
    expect(Array.isArray(result.user.platformRoles)).toBe(true);
  });
});


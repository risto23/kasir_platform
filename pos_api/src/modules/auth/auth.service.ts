import { PlatformRoleCode } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { comparePassword } from '../../utils/password';
import { signAccessToken } from '../../utils/jwt';
import {
  AuthLoginResponse,
  AuthUserResponse,
} from './auth.types';
import {
  buildAccessProfile,
  mapBusinessMemberships,
} from './auth.mapper';

async function findUserWithAuthAccessByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      platformRoles: {
        include: {
          platformRole: true,
        },
      },
      businessUsers: {
        include: {
          business: {
            include: {
              outlets: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
          outletAccesses: {
            include: {
              outlet: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
          businessRole: {
            include: {
              rolePermissions: {
                include: {
                  businessPermission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
}

async function findUserWithAuthAccessById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      platformRoles: {
        include: {
          platformRole: true,
        },
      },
      businessUsers: {
        include: {
          business: {
            include: {
              outlets: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
          outletAccesses: {
            include: {
              outlet: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
          businessRole: {
            include: {
              rolePermissions: {
                include: {
                  businessPermission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
}

function mapUserResponse(user: Awaited<ReturnType<typeof findUserWithAuthAccessById>>): AuthUserResponse {
  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  const businessMemberships = mapBusinessMemberships(user);
  const accessProfile = buildAccessProfile(user);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    platformRoles: user.platformRoles.map((item) => item.platformRole.code),
    businessMemberships,
    accessProfile,
  };
}

export async function loginService(
  email: string,
  password: string,
): Promise<AuthLoginResponse> {
  const user = await findUserWithAuthAccessByEmail(email);

  if (!user) {
    throw new Error('Email atau password salah');
  }

  if (user.status !== 'ACTIVE') {
    throw new Error('User tidak aktif');
  }

  const isValidPassword = await comparePassword(password, user.passwordHash);

  if (!isValidPassword) {
    throw new Error('Email atau password salah');
  }

  const token = signAccessToken({
    userId: user.id,
    email: user.email,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: {
      lastLoginAt: new Date(),
    },
  });

  const refreshedUser = await findUserWithAuthAccessById(user.id);

  if (!refreshedUser) {
    throw new Error('User tidak ditemukan');
  }

  return {
    accessToken: token,
    user: mapUserResponse(refreshedUser),
  };
}

export async function meService(userId: string): Promise<AuthUserResponse> {
  const user = await findUserWithAuthAccessById(userId);

  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  return mapUserResponse(user);
}

export async function getUserPlatformRoleCodes(userId: string): Promise<PlatformRoleCode[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      platformRoles: {
        include: {
          platformRole: {
            select: {
              code: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  return user.platformRoles.map((item) => item.platformRole.code);
}
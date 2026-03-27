import { BusinessRoleCode, PlatformRoleCode } from '@prisma/client';
import { prisma } from '../../config/prisma';
import { comparePassword } from '../../utils/password';
import { signAccessToken } from '../../utils/jwt';

type UserAccessProfile = {
  isSuperAdmin: boolean;
  isBusinessUser: boolean;
  accessScope: 'PLATFORM' | 'BUSINESS' | 'HYBRID' | 'NONE';
  defaultBusinessMembership: {
    businessId: string;
    businessName: string;
    businessType: 'RESTAURANT' | 'RETAIL';
    role: BusinessRoleCode;
    isPrimary: boolean;
  } | null;
};

function buildAccessProfile(user: {
  platformRoles: Array<{
    platformRole: {
      code: PlatformRoleCode;
    };
  }>;
  businessUsers: Array<{
    isPrimary: boolean;
    business: {
      id: string;
      name: string;
      businessType: 'RESTAURANT' | 'RETAIL';
    };
    businessRole: {
      code: BusinessRoleCode;
    };
  }>;
}): UserAccessProfile {
  const platformRoleCodes = user.platformRoles.map((item) => item.platformRole.code);
  const isSuperAdmin = platformRoleCodes.includes(PlatformRoleCode.SUPER_ADMIN);
  const isBusinessUser = user.businessUsers.length > 0;

  let accessScope: UserAccessProfile['accessScope'] = 'NONE';

  if (isSuperAdmin && isBusinessUser) {
    accessScope = 'HYBRID';
  } else if (isSuperAdmin) {
    accessScope = 'PLATFORM';
  } else if (isBusinessUser) {
    accessScope = 'BUSINESS';
  }

  const primaryMembership =
    user.businessUsers.find((item) => item.isPrimary) ?? user.businessUsers[0];

  return {
    isSuperAdmin,
    isBusinessUser,
    accessScope,
    defaultBusinessMembership: primaryMembership
      ? {
          businessId: primaryMembership.business.id,
          businessName: primaryMembership.business.name,
          businessType: primaryMembership.business.businessType,
          role: primaryMembership.businessRole.code,
          isPrimary: primaryMembership.isPrimary,
        }
      : null,
  };
}

export async function loginService(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      platformRoles: {
        include: {
          platformRole: true,
        },
      },
      businessUsers: {
        include: {
          business: true,
          businessRole: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

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

  const accessProfile = buildAccessProfile(user);

  return {
    accessToken: token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      platformRoles: user.platformRoles.map((item) => item.platformRole.code),
      businessMemberships: user.businessUsers.map((item) => ({
        businessId: item.business.id,
        businessName: item.business.name,
        businessType: item.business.businessType,
        role: item.businessRole.code,
        isPrimary: item.isPrimary,
      })),
      accessProfile,
    },
  };
}

export async function meService(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      platformRoles: {
        include: {
          platformRole: true,
        },
      },
      businessUsers: {
        include: {
          business: true,
          businessRole: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!user) {
    throw new Error('User tidak ditemukan');
  }

  const accessProfile = buildAccessProfile(user);

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    status: user.status,
    lastLoginAt: user.lastLoginAt,
    platformRoles: user.platformRoles.map((item) => item.platformRole.code),
    businessMemberships: user.businessUsers.map((item) => ({
      businessId: item.business.id,
      businessName: item.business.name,
      businessType: item.business.businessType,
      role: item.businessRole.code,
      isPrimary: item.isPrimary,
    })),
    accessProfile,
  };
}
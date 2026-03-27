import { NextFunction, Request, Response } from 'express';
import {
  BusinessPermissionCode,
  BusinessRoleCode,
  BusinessUserStatus,
  PlatformRoleCode,
} from '@prisma/client';
import { prisma } from '../config/prisma';
import { errorResponse } from '../utils/api-response';
import { getUserPlatformRoleCodes } from '../modules/auth/auth.service';
import { mapBusinessMembership } from '../modules/auth/auth.mapper';
import type { BusinessMembershipAccess } from '../modules/auth/auth.types';

function getBusinessIdFromRequest(req: Request): string | null {
  const headerValue = req.headers['x-business-id'];

  if (typeof headerValue === 'string' && headerValue.trim() !== '') {
    return headerValue.trim();
  }

  return null;
}

async function buildSuperAdminBusinessAccess(
  requestedBusinessId: string,
): Promise<BusinessMembershipAccess | null> {
  const business = await prisma.business.findFirst({
    where: {
      id: requestedBusinessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
      businessType: true,
      outlets: {
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!business) {
    return null;
  }

  return {
    businessUserId: '',
    businessId: business.id,
    businessName: business.name,
    businessType: business.businessType,
    role: BusinessRoleCode.OWNER,
    status: BusinessUserStatus.ACTIVE,
    isPrimary: false,
    hasAllOutletAccess: true,
    allowedOutletIds: business.outlets.map((item) => item.id),
    permissions: [] as BusinessPermissionCode[],
  };
}

export async function businessAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const userId = req.authUser?.userId;

    if (!userId) {
      return res.status(401).json(errorResponse('Unauthorized'));
    }

    const requestedBusinessId = getBusinessIdFromRequest(req);
    const platformRoleCodes = await getUserPlatformRoleCodes(userId);
    const isSuperAdmin = platformRoleCodes.includes(PlatformRoleCode.SUPER_ADMIN);

    const businessUserMemberships = await prisma.businessUser.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        business: {
          status: 'ACTIVE',
        },
      },
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
                businessId: true,
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
    });

    if (requestedBusinessId) {
      const selectedMembership = businessUserMemberships.find(
        (item) => item.businessId === requestedBusinessId,
      );

      if (selectedMembership) {
        req.businessAccess = mapBusinessMembership(selectedMembership);
        return next();
      }

      if (isSuperAdmin) {
        const superAdminBusinessAccess =
          await buildSuperAdminBusinessAccess(requestedBusinessId);

        if (!superAdminBusinessAccess) {
          return res.status(404).json(errorResponse('Business tidak ditemukan'));
        }

        req.businessAccess = superAdminBusinessAccess;
        return next();
      }

      return res
        .status(403)
        .json(errorResponse('Tidak memiliki akses ke business ini'));
    }

    const defaultMembership =
      businessUserMemberships.find((item) => item.isPrimary) ??
      businessUserMemberships[0];

    if (defaultMembership) {
      req.businessAccess = mapBusinessMembership(defaultMembership);
      return next();
    }

    if (isSuperAdmin) {
      return res.status(400).json(
        errorResponse(
          'Super admin wajib memilih business aktif terlebih dahulu. Kirim header x-business-id.',
        ),
      );
    }

    return res
      .status(403)
      .json(errorResponse('User tidak memiliki akses business aktif'));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Gagal memuat business access';

    return res.status(500).json(errorResponse(message));
  }
}
import { NextFunction, Request, Response } from 'express';
import { BusinessPermissionCode, PlatformRoleCode } from '@prisma/client';
import { errorResponse } from '../utils/api-response';
import { getUserPlatformRoleCodes } from '../modules/auth/auth.service';

export function requireBusinessPermission(
  permissionCode: BusinessPermissionCode,
) {
  return async function businessPermissionGuard(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.authUser?.userId;

      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const platformRoleCodes = await getUserPlatformRoleCodes(userId);
      const isSuperAdmin = platformRoleCodes.includes(PlatformRoleCode.SUPER_ADMIN);

      if (isSuperAdmin) {
        return next();
      }

      const businessAccess = req.businessAccess;

      if (!businessAccess) {
        return res
          .status(403)
          .json(errorResponse('Business access context belum tersedia'));
      }

      if (businessAccess.status !== 'ACTIVE') {
        return res
          .status(403)
          .json(errorResponse('User business tidak aktif'));
      }

      const hasPermission = businessAccess.permissions.includes(permissionCode);

      if (!hasPermission) {
        return res
          .status(403)
          .json(
            errorResponse('Tidak memiliki permission untuk mengakses resource ini'),
          );
      }

      return next();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memeriksa permission business';

      return res.status(500).json(errorResponse(message));
    }
  };
}
import type { NextFunction, Request, Response } from 'express';
import { PlatformRoleCode } from '@prisma/client';
import { getUserPlatformRoleCodes } from '../modules/auth/auth.service';
import { errorResponse } from '../utils/api-response';

export async function requireSubscriptionManagementAccess(
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

    if (!isSuperAdmin) {
      return res.status(403).json(
        errorResponse(
          'Hanya super admin yang dapat memilih atau mengubah plan subscription',
        ),
      );
    }

    return next();
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Gagal memverifikasi akses manajemen subscription';

    return res.status(500).json(errorResponse(message));
  }
}

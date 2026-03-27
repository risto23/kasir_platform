import { NextFunction, Request, Response } from 'express';
import { PlatformRoleCode } from '@prisma/client';
import { prisma } from '../config/prisma';
import { errorResponse } from '../utils/api-response';
import { getUserPlatformRoleCodes } from '../modules/auth/auth.service';

type OutletIdResolver = (req: Request) => string | null | undefined;

function defaultOutletIdResolver(req: Request): string | null {
  const paramsOutletId = req.params.outletId;
  if (typeof paramsOutletId === 'string' && paramsOutletId.trim() !== '') {
    return paramsOutletId.trim();
  }

  const body = req.body as { outletId?: unknown };
  if (typeof body?.outletId === 'string' && body.outletId.trim() !== '') {
    return body.outletId.trim();
  }

  const queryOutletId = req.query.outletId;
  if (typeof queryOutletId === 'string' && queryOutletId.trim() !== '') {
    return queryOutletId.trim();
  }

  const headerOutletId = req.headers['x-outlet-id'];
  if (typeof headerOutletId === 'string' && headerOutletId.trim() !== '') {
    return headerOutletId.trim();
  }

  return null;
}

export function requireOutletAccess(
  outletIdResolver: OutletIdResolver = defaultOutletIdResolver,
) {
  return async function outletAccessGuard(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const userId = req.authUser?.userId;

      if (!userId) {
        return res.status(401).json(errorResponse('Unauthorized'));
      }

      const outletId = outletIdResolver(req);

      if (!outletId) {
        return res.status(400).json(errorResponse('outletId wajib diisi'));
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

      const platformRoleCodes = await getUserPlatformRoleCodes(userId);
      const isSuperAdmin = platformRoleCodes.includes(PlatformRoleCode.SUPER_ADMIN);

      const outlet = await prisma.outlet.findFirst({
        where: {
          id: outletId,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          businessId: true,
        },
      });

      if (!outlet) {
        return res.status(404).json(errorResponse('Outlet tidak ditemukan'));
      }

      if (businessAccess.businessId && outlet.businessId !== businessAccess.businessId) {
        if (!isSuperAdmin) {
          return res
            .status(403)
            .json(errorResponse('Outlet tidak termasuk dalam business aktif'));
        }
      }

      if (isSuperAdmin) {
        return next();
      }

      if (businessAccess.hasAllOutletAccess) {
        return next();
      }

      const hasOutletAccess = businessAccess.allowedOutletIds.includes(outlet.id);

      if (!hasOutletAccess) {
        return res
          .status(403)
          .json(errorResponse('Tidak memiliki akses ke outlet ini'));
      }

      return next();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memeriksa outlet access';

      return res.status(500).json(errorResponse(message));
    }
  };
}
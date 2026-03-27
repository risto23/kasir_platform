import { NextFunction, Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { errorResponse } from '../utils/api-response';
import { PlatformRoleCode } from '@prisma/client';

export function requirePlatformRole(roleCode: PlatformRoleCode) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.authUser?.userId) {
      return res.status(401).json(errorResponse('Unauthorized'));
    }

    const userRole = await prisma.userPlatformRole.findFirst({
      where: {
        userId: req.authUser.userId,
        platformRole: {
          code: roleCode,
        },
      },
      include: {
        platformRole: true,
      },
    });

    if (!userRole) {
      return res.status(403).json(errorResponse('Forbidden'));
    }

    next();
  };
}
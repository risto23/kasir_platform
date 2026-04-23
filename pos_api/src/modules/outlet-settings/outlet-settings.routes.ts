import { Router, type Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getOutletSettingsController,
  putOutletSettingsController,
} from './outlet-settings.controller';
import {
  getOutletSettingsQuerySchema,
  putOutletSettingsBodySchema,
} from './outlet-settings.validation';

function resolveOutletIdFromQuery(req: Request): string | null {
  const outletId = typeof req.query.outletId === 'string' ? req.query.outletId : '';
  return outletId && outletId.trim() !== '' ? outletId.trim() : null;
}

function resolveOutletIdFromBody(req: Request): string | null {
  const outletId = typeof req.body?.outletId === 'string' ? req.body.outletId : '';
  return outletId && outletId.trim() !== '' ? outletId.trim() : null;
}

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/outlet',
  validate(getOutletSettingsQuerySchema),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_VIEW),
  requireOutletAccess(resolveOutletIdFromQuery),
  getOutletSettingsController,
);

router.put(
  '/outlet',
  validate(putOutletSettingsBodySchema),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_UPDATE),
  requireOutletAccess(resolveOutletIdFromBody),
  putOutletSettingsController,
);

export default router;

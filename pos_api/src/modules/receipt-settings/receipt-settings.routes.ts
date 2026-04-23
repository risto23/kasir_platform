import { Router, type Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getReceiptSettingsController,
  putReceiptSettingsController,
} from './receipt-settings.controller';
import {
  getReceiptSettingsQuerySchema,
  putReceiptSettingsBodySchema,
} from './receipt-settings.validation';

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
  '/receipt',
  validate(getReceiptSettingsQuerySchema),
  requireBusinessPermission(BusinessPermissionCode.RECEIPT_VIEW),
  requireOutletAccess(resolveOutletIdFromQuery),
  getReceiptSettingsController,
);

router.put(
  '/receipt',
  validate(putReceiptSettingsBodySchema),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_UPDATE),
  requireOutletAccess(resolveOutletIdFromBody),
  putReceiptSettingsController,
);

export default router;

import { Router, type Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getOutletTableMonitorController,
  getTableQrController,
} from './restaurant-operations.controller';
import {
  getOutletTableMonitorValidationSchema,
  getTableQrValidationSchema,
} from './restaurant-operations.validation';

import {
  requireFeatureFlag,
  requireFeatureFlagForOutletParam,
} from '../../middlewares/require-feature-flag.middleware';

const router = Router();

function resolveOutletId(req: Request): string | null {
  const rawOutletId = req.params.outletId;

  if (typeof rawOutletId !== 'string' || rawOutletId.trim() === '') {
    return null;
  }

  return rawOutletId.trim();
}

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/outlets/:outletId/qr/tables/:tableId',
  requireFeatureFlag('TABLE_MANAGEMENT'),
  requireFeatureFlagForOutletParam('GUEST_QR', resolveOutletId),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_TABLE_VIEW),
  requireOutletAccess(resolveOutletId),
  validate(getTableQrValidationSchema),
  getTableQrController,
);

router.get(
  '/outlets/:outletId/tables/monitor',
  requireFeatureFlag('TABLE_MANAGEMENT'),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_TABLE_VIEW),
  requireOutletAccess(resolveOutletId),
  validate(getOutletTableMonitorValidationSchema),
  getOutletTableMonitorController,
);

export default router;

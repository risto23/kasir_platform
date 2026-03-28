import { Router, type Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';

import {
  getProductOutletSettingsByProductIdHandler,
  listProductOutletSettingsHandler,
  updateProductOutletSettingHandler,
} from './product-outlet-settings.controller';

const router = Router();

function resolveOutletId(req: Request): string | undefined {
  const outletId = req.params.outletId;
  return Array.isArray(outletId) ? outletId[0] : outletId;
}

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_OUTLET_VIEW),
  listProductOutletSettingsHandler,
);

router.get(
  '/products/:productId',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_OUTLET_VIEW),
  getProductOutletSettingsByProductIdHandler,
);

router.put(
  '/products/:productId/outlets/:outletId',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_OUTLET_UPDATE),
  requireOutletAccess(resolveOutletId),
  updateProductOutletSettingHandler,
);

export default router;
// pos_api/src/modules/outlet-tables/outlet-tables.routes.ts
import { Router, type Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';

import {
  createOutletTableHandler,
  getOutletTableByIdHandler,
  listOutletTablesHandler,
  updateOutletTableHandler,
  updateOutletTableStatusHandler,
} from './outlet-tables.controller';

import { requireFeatureFlag } from '../../middlewares/require-feature-flag.middleware';

const router = Router();

function resolveOutletId(req: Request): string | undefined {
  const outletId = req.params.outletId;
  return Array.isArray(outletId) ? outletId[0] : outletId;
}

router.use(authMiddleware);
router.use(businessAccessMiddleware);

// console.log('Outlet tables routes initialized with auth and business access middleware');

router.get(
  '/:outletId/tables',
  
  requireBusinessPermission(BusinessPermissionCode.OUTLET_TABLE_VIEW),
  requireOutletAccess(resolveOutletId),
  listOutletTablesHandler,
);

router.get(
  '/:outletId/tables/:id',
  requireBusinessPermission(BusinessPermissionCode.OUTLET_TABLE_VIEW),
  requireOutletAccess(resolveOutletId),
  getOutletTableByIdHandler,
);

router.post(
  '/:outletId/tables',
  requireBusinessPermission(BusinessPermissionCode.OUTLET_TABLE_CREATE),
  requireOutletAccess(resolveOutletId),
  createOutletTableHandler,
);

router.put(
  '/:outletId/tables/:id',
  requireBusinessPermission(BusinessPermissionCode.OUTLET_TABLE_UPDATE),
  requireOutletAccess(resolveOutletId),
  updateOutletTableHandler,
);

router.patch(
  '/:outletId/tables/:id/status',
  requireBusinessPermission(BusinessPermissionCode.OUTLET_TABLE_STATUS_UPDATE),
  requireOutletAccess(resolveOutletId),
  updateOutletTableStatusHandler,
);

export default router;

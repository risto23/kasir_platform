import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import {
  createPurchaseOrderHandler,
  getPurchaseOrderByIdHandler,
  listPurchaseOrdersHandler,
  updatePurchaseOrderHandler,
  updatePurchaseOrderStatusHandler,
} from './purchase-orders.controller';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  listPurchaseOrdersHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  getPurchaseOrderByIdHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_CREATE),
  requireOutletAccess(),
  createPurchaseOrderHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_UPDATE),
  requireOutletAccess(),
  updatePurchaseOrderHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_STATUS_UPDATE),
  requireOutletAccess(),
  updatePurchaseOrderStatusHandler,
);

export default router;

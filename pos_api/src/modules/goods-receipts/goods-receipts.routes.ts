import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import {
  createGoodsReceiptHandler,
  getGoodsReceiptByIdHandler,
  listGoodsReceiptsHandler,
  postGoodsReceiptHandler,
  updateGoodsReceiptHandler,
  voidGoodsReceiptHandler,
} from './goods-receipts.controller';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  listGoodsReceiptsHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  getGoodsReceiptByIdHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_CREATE),
  requireOutletAccess(),
  createGoodsReceiptHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_UPDATE),
  requireOutletAccess(),
  updateGoodsReceiptHandler,
);

router.patch(
  '/:id/post',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_STATUS_UPDATE),
  requireOutletAccess(),
  postGoodsReceiptHandler,
);

router.patch(
  '/:id/void',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_STATUS_UPDATE),
  requireOutletAccess(),
  voidGoodsReceiptHandler,
);

export default router;

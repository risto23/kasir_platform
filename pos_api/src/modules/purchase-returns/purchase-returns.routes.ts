import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import {
  createPurchaseReturnHandler,
  getPurchaseReturnByIdHandler,
  listPurchaseReturnsHandler,
  postPurchaseReturnHandler,
  updatePurchaseReturnHandler,
  voidPurchaseReturnHandler,
} from './purchase-returns.controller';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  listPurchaseReturnsHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  getPurchaseReturnByIdHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_CREATE),
  requireOutletAccess(),
  createPurchaseReturnHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_UPDATE),
  requireOutletAccess(),
  updatePurchaseReturnHandler,
);

router.patch(
  '/:id/post',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_STATUS_UPDATE),
  requireOutletAccess(),
  postPurchaseReturnHandler,
);

router.patch(
  '/:id/void',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_STATUS_UPDATE),
  requireOutletAccess(),
  voidPurchaseReturnHandler,
);

export default router;

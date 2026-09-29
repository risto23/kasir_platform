import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import {
  applySupplierCreditHandler,
  getSupplierCreditByIdHandler,
  listSupplierCreditsHandler,
  refundSupplierCreditHandler,
} from './supplier-credits.controller';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  listSupplierCreditsHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  requireOutletAccess(),
  getSupplierCreditByIdHandler,
);

// Same permission as recording a supplier payment.
router.post(
  '/:id/refunds',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_CREATE),
  requireOutletAccess(),
  refundSupplierCreditHandler,
);

router.post(
  '/:id/apply',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_CREATE),
  requireOutletAccess(),
  applySupplierCreditHandler,
);

export default router;

import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  createSupplierHandler,
  getSupplierDetailHandler,
  listSuppliersHandler,
  updateSupplierHandler,
  updateSupplierStatusHandler,
} from './suppliers.controller';
import {
  validateCreateSupplier,
  validateListSuppliers,
  validateSupplierParams,
  validateUpdateSupplier,
  validateUpdateSupplierStatus,
} from './suppliers.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  validateListSuppliers,
  listSuppliersHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  validateSupplierParams,
  getSupplierDetailHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_CREATE),
  validateCreateSupplier,
  createSupplierHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_UPDATE),
  validateSupplierParams,
  validateUpdateSupplier,
  updateSupplierHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_STATUS_UPDATE),
  validateSupplierParams,
  validateUpdateSupplierStatus,
  updateSupplierStatusHandler,
);

export default router;

import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  createSupplierProductHandler,
  deleteSupplierProductHandler,
  listSupplierProductsHandler,
  updateSupplierProductHandler,
} from './supplier-products.controller';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/:supplierId/products',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  listSupplierProductsHandler,
);

router.post(
  '/:supplierId/products',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_UPDATE),
  createSupplierProductHandler,
);

router.put(
  '/:supplierId/products/:mappingId',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_UPDATE),
  updateSupplierProductHandler,
);

router.delete(
  '/:supplierId/products/:mappingId',
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_UPDATE),
  deleteSupplierProductHandler,
);

export default router;

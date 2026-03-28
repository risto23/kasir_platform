import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  listProductsHandler,
  getProductDetailHandler,
  createProductHandler,
  updateProductHandler,
  updateProductStatusHandler,
} from './products.controller';
import {
  validateListProducts,
  validateProductParams,
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
} from './products.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_VIEW),
  validateListProducts,
  listProductsHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_VIEW),
  validateProductParams,
  getProductDetailHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_CREATE),
  validateCreateProduct,
  createProductHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_UPDATE),
  validateProductParams,
  validateUpdateProduct,
  updateProductHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_STATUS_UPDATE),
  validateProductParams,
  validateUpdateProductStatus,
  updateProductStatusHandler,
);

export default router;
// pos_api/src/modules/business-product/product.routes.ts
import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';

import {
  createProductHandler,
  getProductDetailHandler,
  getProductListHandler,
  updateProductHandler,
  updateProductStatusHandler,
} from './product.controller';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_VIEW),
  getProductListHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_VIEW),
  getProductDetailHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_CREATE),
  createProductHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_UPDATE),
  updateProductHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_STATUS_UPDATE),
  updateProductStatusHandler,
);

export default router;
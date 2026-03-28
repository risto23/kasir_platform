import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  listCategoriesHandler,
  getCategoryDetailHandler,
  createCategoryHandler,
  updateCategoryHandler,
  updateCategoryStatusHandler,
} from './categories.controller';
import {
  validateListCategories,
  validateCategoryParams,
  validateCreateCategory,
  validateUpdateCategory,
  validateUpdateCategoryStatus,
} from './categories.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.CATEGORY_VIEW),
  validateListCategories,
  listCategoriesHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.CATEGORY_VIEW),
  validateCategoryParams,
  getCategoryDetailHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.CATEGORY_CREATE),
  validateCreateCategory,
  createCategoryHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.CATEGORY_UPDATE),
  validateCategoryParams,
  validateUpdateCategory,
  updateCategoryHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.CATEGORY_STATUS_UPDATE),
  validateCategoryParams,
  validateUpdateCategoryStatus,
  updateCategoryStatusHandler,
);

export default router;
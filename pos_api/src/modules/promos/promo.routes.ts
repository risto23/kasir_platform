import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createPromoController,
  getPromoByIdController,
  getPromoFormMetaController,
  listPromosController,
  updatePromoController,
  updatePromoStatusController,
} from './promo.controller';
import {
  createPromoSchema,
  getPromoByIdSchema,
  listPromosSchema,
  updatePromoSchema,
  updatePromoStatusSchema,
} from './promo.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/meta/form',
  requireBusinessPermission(BusinessPermissionCode.PROMO_VIEW),
  getPromoFormMetaController,
);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PROMO_VIEW),
  validate(listPromosSchema),
  listPromosController,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PROMO_VIEW),
  validate(getPromoByIdSchema),
  getPromoByIdController,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PROMO_CREATE),
  validate(createPromoSchema),
  createPromoController,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PROMO_UPDATE),
  validate(updatePromoSchema),
  updatePromoController,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.PROMO_STATUS_UPDATE),
  validate(updatePromoStatusSchema),
  updatePromoStatusController,
);

export default router;
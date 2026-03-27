// pos_api/src/modules/platform-business/platform-business.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePlatformRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { PlatformRoleCode } from '@prisma/client';
import {
  createBusinessController,
  getBusinessByIdController,
  listBusinessesController,
  updateBusinessController,
  updateBusinessStatusController,
} from './platform-business.controller';
import {
  businessIdParamSchema,
  createBusinessSchema,
  updateBusinessSchema,
  updateBusinessStatusSchema,
} from './platform-business.validation';

const router = Router();

router.use(authMiddleware);
router.use(requirePlatformRole(PlatformRoleCode.SUPER_ADMIN));

router.get('/', listBusinessesController);
router.post('/', validate(createBusinessSchema), createBusinessController);
router.get('/:id', validate(businessIdParamSchema), getBusinessByIdController);
router.put('/:id', validate(updateBusinessSchema), updateBusinessController);
router.patch(
  '/:id/status',
  validate(updateBusinessStatusSchema),
  updateBusinessStatusController
);

export default router;
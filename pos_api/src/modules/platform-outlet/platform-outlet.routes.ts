// pos_api/src/modules/platform-outlet/platform-outlet.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePlatformRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { PlatformRoleCode } from '@prisma/client';
import {
  createOutletController,
  getOutletByIdController,
  listOutletsController,
  updateOutletController,
  updateOutletStatusController,
} from './platform-outlet.controller';
import {
  createOutletSchema,
  outletIdParamSchema,
  updateOutletSchema,
  updateOutletStatusSchema,
} from './platform-outlet.validation';

const router = Router();

router.use(authMiddleware);
router.use(requirePlatformRole(PlatformRoleCode.SUPER_ADMIN));

router.get('/', listOutletsController);
router.post('/', validate(createOutletSchema), createOutletController);
router.get('/:id', validate(outletIdParamSchema), getOutletByIdController);
router.put('/:id', validate(updateOutletSchema), updateOutletController);
router.patch(
  '/:id/status',
  validate(updateOutletStatusSchema),
  updateOutletStatusController
);

export default router;
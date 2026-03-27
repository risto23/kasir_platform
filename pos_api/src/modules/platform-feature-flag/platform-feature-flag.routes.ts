import { Router } from 'express';
import { PlatformRoleCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePlatformRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getBusinessFeatureFlagsController,
  listFeatureFlagsController,
  updateBusinessFeatureFlagsController,
} from './platform-feature-flag.controller';
import {
  businessFeatureFlagParamSchema,
  updateBusinessFeatureFlagsSchema,
} from './platform-feature-flag.validation';

const router = Router();

router.use(authMiddleware);
router.use(requirePlatformRole(PlatformRoleCode.SUPER_ADMIN));

router.get('/feature-flags', listFeatureFlagsController);
router.get(
  '/businesses/:id/feature-flags',
  validate(businessFeatureFlagParamSchema),
  getBusinessFeatureFlagsController
);
router.put(
  '/businesses/:id/feature-flags',
  validate(updateBusinessFeatureFlagsSchema),
  updateBusinessFeatureFlagsController
);

export default router;
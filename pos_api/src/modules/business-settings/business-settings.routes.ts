import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getBusinessSettingsController,
  putBusinessSettingsController,
} from './business-settings.controller';
import { putBusinessSettingsBodySchema } from './business-settings.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/business',
  requireBusinessPermission(BusinessPermissionCode.OUTLET_VIEW),
  getBusinessSettingsController,
);

router.put(
  '/business',
  validate(putBusinessSettingsBodySchema),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_UPDATE),
  putBusinessSettingsController,
);

export default router;

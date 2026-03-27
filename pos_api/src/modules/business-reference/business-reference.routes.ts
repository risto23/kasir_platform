import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  getBusinessPermissionsController,
  getBusinessRolesController,
} from './business-reference.controller';
import businessUsersRoutes from '../business-users/business-user.routes';
import outletsRoutes from '../outlets/outlets.routes';

const router = Router();

router.get(
  '/roles',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_ROLE_VIEW'),
  getBusinessRolesController,
);

router.get(
  '/permissions',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_PERMISSION_VIEW'),
  getBusinessPermissionsController,
);

router.use('/users', businessUsersRoutes);
router.use('/outlets', outletsRoutes);

export default router;
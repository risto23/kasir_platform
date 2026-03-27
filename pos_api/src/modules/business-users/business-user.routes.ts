import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  createBusinessUserController,
  getBusinessUserDetailController,
  getBusinessUserOutletAccessController,
  listBusinessUsersController,
  updateBusinessUserController,
  updateBusinessUserOutletAccessController,
  updateBusinessUserStatusController,
} from './business-users.controller';
import {
  validateBusinessUserIdParam,
  validateCreateBusinessUser,
  validateListBusinessUsersQuery,
  validateUpdateBusinessUser,
  validateUpdateBusinessUserOutletAccess,
  validateUpdateBusinessUserStatus,
} from './business-users.validation';

const router = Router();

router.get(
  '/',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_USER_VIEW'),
  validateListBusinessUsersQuery,
  listBusinessUsersController,
);

router.post(
  '/',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_USER_CREATE'),
  validateCreateBusinessUser,
  createBusinessUserController,
);

router.get(
  '/:id',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_USER_VIEW'),
  validateBusinessUserIdParam,
  getBusinessUserDetailController,
);

router.put(
  '/:id',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_USER_UPDATE'),
  validateBusinessUserIdParam,
  validateUpdateBusinessUser,
  updateBusinessUserController,
);

router.patch(
  '/:id/status',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_USER_STATUS_UPDATE'),
  validateBusinessUserIdParam,
  validateUpdateBusinessUserStatus,
  updateBusinessUserStatusController,
);

router.get(
  '/:id/outlet-access',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('OUTLET_SCOPE_VIEW'),
  validateBusinessUserIdParam,
  getBusinessUserOutletAccessController,
);

router.put(
  '/:id/outlet-access',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_USER_ASSIGN_OUTLET'),
  validateBusinessUserIdParam,
  validateUpdateBusinessUserOutletAccess,
  updateBusinessUserOutletAccessController,
);

export default router;
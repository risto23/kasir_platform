import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  createOutletController,
  getOutletDetailController,
  listOutletsController,
  updateOutletController,
  updateOutletStatusController,
} from './outlets.controller';
import {
  validateCreateOutlet,
  validateListOutletsQuery,
  validateOutletIdParam,
  validateUpdateOutlet,
  validateUpdateOutletStatus,
} from './outlets.validation';

const router = Router();

router.get(
  '/',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('OUTLET_VIEW'),
  validateListOutletsQuery,
  listOutletsController,
);

router.post(
  '/',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('OUTLET_CREATE'),
  validateCreateOutlet,
  createOutletController,
);

router.get(
  '/:id',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('OUTLET_VIEW'),
  validateOutletIdParam,
  getOutletDetailController,
);

router.put(
  '/:id',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('OUTLET_UPDATE'),
  validateOutletIdParam,
  validateUpdateOutlet,
  updateOutletController,
);

router.patch(
  '/:id/status',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('OUTLET_STATUS_UPDATE'),
  validateOutletIdParam,
  validateUpdateOutletStatus,
  updateOutletStatusController,
);

export default router;
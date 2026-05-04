// pos_api/src/modules/outlets/outlets.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireSubscriptionWriteAccess } from '../../middlewares/subscription-write-access.middleware';
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
  requireSubscriptionWriteAccess('CREATE_OUTLET'),
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
  requireSubscriptionWriteAccess('UPDATE_OUTLET'),
  validateOutletIdParam,
  validateUpdateOutlet,
  updateOutletController,
);

router.patch(
  '/:id/status',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('OUTLET_STATUS_UPDATE'),
  requireSubscriptionWriteAccess('UPDATE_OUTLET_STATUS'),
  validateOutletIdParam,
  validateUpdateOutletStatus,
  updateOutletStatusController,
);



export default router;

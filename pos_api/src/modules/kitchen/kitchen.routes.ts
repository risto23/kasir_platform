// pos_api/src/modules/kitchen/kitchen.routes.ts
import { Router, Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getKitchenOrdersController,
  updateKitchenOrderItemStatusController,
} from './kitchen.controller';
import {
  listKitchenOrdersSchema,
  updateKitchenOrderItemStatusSchema,
} from './kitchen.validation';

const router = Router();

function resolveOutletIdFromKitchenListParams(req: Request): string | null {
  const outletId = req.params.outletId;

  if (typeof outletId === 'string' && outletId.trim() !== '') {
    return outletId.trim();
  }

  return null;
}

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/outlets/:outletId/kitchen/orders',
  validate(listKitchenOrdersSchema),
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  requireOutletAccess(resolveOutletIdFromKitchenListParams),
  getKitchenOrdersController,
);

router.patch(
  '/kitchen/orders/:id/items/:itemId/status',
  validate(updateKitchenOrderItemStatusSchema),
  requireBusinessPermission(BusinessPermissionCode.ORDER_UPDATE),
  updateKitchenOrderItemStatusController,
);

export default router;
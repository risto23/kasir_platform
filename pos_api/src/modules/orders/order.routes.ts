import { Router, Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';

import {
  addOrderItemHandler,
  createOrderHandler,
  getOrderByIdHandler,
  listOrdersHandler,
  updateOrderItemHandler,
  updateOrderStatusHandler,
} from './order.controller';
import {
  addOrderItemSchema,
  createOrderSchema,
  getOrderByIdSchema,
  listOrdersSchema,
  updateOrderItemSchema,
  updateOrderStatusSchema,
} from './order.validation';

function resolveOutletIdFromQueryOrHeader(req: Request): string | null {
  if (typeof req.query.outletId === 'string' && req.query.outletId.trim() !== '') {
    return req.query.outletId.trim();
  }

  const headerOutletId = req.headers['x-outlet-id'];
  if (typeof headerOutletId === 'string' && headerOutletId.trim() !== '') {
    return headerOutletId.trim();
  }

  return null;
}

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(listOrdersSchema),
  requireOutletAccess(resolveOutletIdFromQueryOrHeader),
  listOrdersHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(getOrderByIdSchema),
  requireOutletAccess(resolveOutletIdFromQueryOrHeader),
  getOrderByIdHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.ORDER_CREATE),
  validate(createOrderSchema),
  requireOutletAccess((req) => req.body.outletId),
  createOrderHandler,
);

router.post(
  '/:id/items',
  requireBusinessPermission(BusinessPermissionCode.ORDER_UPDATE),
  validate(addOrderItemSchema),
  requireOutletAccess((req) => req.body.outletId),
  addOrderItemHandler,
);

router.put(
  '/:id/items/:itemId',
  requireBusinessPermission(BusinessPermissionCode.ORDER_UPDATE),
  validate(updateOrderItemSchema),
  requireOutletAccess((req) => req.body.outletId),
  updateOrderItemHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.ORDER_STATUS_UPDATE),
  validate(updateOrderStatusSchema),
  requireOutletAccess((req) => req.body.outletId),
  updateOrderStatusHandler,
);

export default router;
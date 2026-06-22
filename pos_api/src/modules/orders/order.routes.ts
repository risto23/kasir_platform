import { Router, type Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { requireSubscriptionWriteAccess } from '../../middlewares/subscription-write-access.middleware';
import { validate } from '../../middlewares/validate.middleware';


import {
  addOrderItemHandler,
  createOrderHandler,
  deleteOrderHandler,
  getOrderByIdHandler,
  listOrdersHandler,
  removeOrderItemHandler,
  updateOrderItemHandler,
  updateOrderStatusHandler,
} from './order.controller';
import {
  addOrderItemSchema,
  createOrderSchema,
  deleteOrderSchema,
  getOrderByIdSchema,
  listOrdersSchema,
  updateOrderItemSchema,
  updateOrderStatusSchema,
} from './order.validation';

function getHeaderOutletId(req: Request): string | null {
  const headerOutletId = req.headers['x-outlet-id'];

  if (typeof headerOutletId === 'string' && headerOutletId.trim() !== '') {
    return headerOutletId.trim();
  }

  return null;
}

function resolveOutletIdFromListOrders(req: Request): string | null {
  const parsed = listOrdersSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success) {
    return parsed.data.query.outletId;
  }

  return getHeaderOutletId(req);
}

function resolveOutletIdFromGetOrderById(req: Request): string | null {
  const parsed = getOrderByIdSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success && parsed.data.query.outletId) {
    return parsed.data.query.outletId;
  }

  return getHeaderOutletId(req);
}

function resolveOutletIdFromCreateOrder(req: Request): string | null {
  const parsed = createOrderSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success) {
    return parsed.data.body.outletId;
  }

  return null;
}

function resolveOutletIdFromAddOrderItem(req: Request): string | null {
  const parsed = addOrderItemSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success) {
    return parsed.data.body.outletId;
  }

  return null;
}

function resolveOutletIdFromUpdateOrderItem(req: Request): string | null {
  const parsed = updateOrderItemSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success) {
    return parsed.data.body.outletId;
  }

  return null;
}

function resolveOutletIdFromDeleteOrderItem(req: Request): string | null {
  const queryOutletId = req.query.outletId;
  if (typeof queryOutletId === 'string' && queryOutletId.trim() !== '') {
    return queryOutletId.trim();
  }
  const bodyOutletId = (req.body as { outletId?: unknown })?.outletId;
  if (typeof bodyOutletId === 'string' && bodyOutletId.trim() !== '') {
    return bodyOutletId.trim();
  }
  return getHeaderOutletId(req);
}

function resolveOutletIdFromUpdateOrderStatus(req: Request): string | null {
  const parsed = updateOrderStatusSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success) {
    return parsed.data.body.outletId;
  }

  return null;
}

function resolveOutletIdFromDeleteOrder(req: Request): string | null {
  const parsed = deleteOrderSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success) {
    return parsed.data.query.outletId;
  }

  return getHeaderOutletId(req);
}

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(listOrdersSchema),
  requireOutletAccess(resolveOutletIdFromListOrders),
  listOrdersHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(getOrderByIdSchema),
  requireOutletAccess(resolveOutletIdFromGetOrderById),
  getOrderByIdHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.ORDER_CREATE),
  requireSubscriptionWriteAccess('CREATE_ORDER'),
  validate(createOrderSchema),
  requireOutletAccess(resolveOutletIdFromCreateOrder),
  createOrderHandler,
);

router.post(
  '/:id/items',
  requireBusinessPermission(BusinessPermissionCode.ORDER_UPDATE),
  requireSubscriptionWriteAccess('ADD_ORDER_ITEM'),
  validate(addOrderItemSchema),
  requireOutletAccess(resolveOutletIdFromAddOrderItem),
  addOrderItemHandler,
);

router.put(
  '/:id/items/:itemId',
  requireBusinessPermission(BusinessPermissionCode.ORDER_UPDATE),
  requireSubscriptionWriteAccess('UPDATE_ORDER_ITEM'),
  validate(updateOrderItemSchema),
  requireOutletAccess(resolveOutletIdFromUpdateOrderItem),
  updateOrderItemHandler,
);

router.delete(
  '/:id/items/:itemId',
  requireBusinessPermission(BusinessPermissionCode.ORDER_UPDATE),
  requireOutletAccess(resolveOutletIdFromDeleteOrderItem),
  removeOrderItemHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.ORDER_STATUS_UPDATE),
  requireSubscriptionWriteAccess('UPDATE_ORDER_STATUS'),
  validate(updateOrderStatusSchema),
  requireOutletAccess(resolveOutletIdFromUpdateOrderStatus),
  updateOrderStatusHandler,
);

router.delete(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.ORDER_STATUS_UPDATE),
  validate(deleteOrderSchema),
  requireOutletAccess(resolveOutletIdFromDeleteOrder),
  deleteOrderHandler,
);

export default router;

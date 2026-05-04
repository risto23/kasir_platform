import { Router, Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { requireSubscriptionWriteAccess } from '../../middlewares/subscription-write-access.middleware';
import { validate } from '../../middlewares/validate.middleware';

import {
  createPaymentHandler,
  getPaymentByIdHandler,
  listPaymentsHandler,
} from './payment.controller';
import {
  createPaymentSchema,
  getPaymentByIdSchema,
  listPaymentsSchema,
} from './payment.validation';

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

function resolveOutletIdFromCreatePayment(req: Request): string | null {
  const parsed = createPaymentSchema.safeParse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  if (parsed.success) {
    return parsed.data.body.outletId;
  }

  return null;
}

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PAYMENT_VIEW),
  validate(listPaymentsSchema),
  requireOutletAccess(resolveOutletIdFromQueryOrHeader),
  listPaymentsHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PAYMENT_VIEW),
  validate(getPaymentByIdSchema),
  requireOutletAccess(resolveOutletIdFromQueryOrHeader),
  getPaymentByIdHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PAYMENT_CREATE),
  requireSubscriptionWriteAccess('CREATE_PAYMENT'),
  validate(createPaymentSchema),
  requireOutletAccess(resolveOutletIdFromCreatePayment),
  createPaymentHandler,
);

export default router;

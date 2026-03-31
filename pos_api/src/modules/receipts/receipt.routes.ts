import { Router, Request } from 'express';
import { BusinessPermissionCode } from '@prisma/client';

import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';

import {
  getReceiptByIdHandler,
  getReceiptByOrderIdHandler,
} from './receipt.controller';
import {
  getReceiptByIdSchema,
  getReceiptByOrderIdSchema,
} from './receipt.validation';

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
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.RECEIPT_VIEW),
  validate(getReceiptByIdSchema),
  requireOutletAccess(resolveOutletIdFromQueryOrHeader),
  getReceiptByIdHandler,
);

router.get(
  '/order/:orderId',
  requireBusinessPermission(BusinessPermissionCode.RECEIPT_VIEW),
  validate(getReceiptByOrderIdSchema),
  requireOutletAccess(resolveOutletIdFromQueryOrHeader),
  getReceiptByOrderIdHandler,
);

export default router;
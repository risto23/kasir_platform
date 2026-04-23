import { Router } from 'express';
import { validate } from '../../middlewares/validate.middleware';
import {
  createGuestOrderController,
  getGuestMenuController,
} from './guest.controller';
import {
  createGuestOrderValidationSchema,
  guestMenuValidationSchema,
} from './guest.validation';

import { requireFeatureFlagForOutletParam } from '../../middlewares/require-feature-flag.middleware';
import {
  guestReadRateLimit,
  guestWriteRateLimit,
} from '../../middlewares/rate-limit.middleware';

const router = Router();

router.get(
  '/outlets/:outletId/guest/menu',
  guestReadRateLimit,
  requireFeatureFlagForOutletParam('GUEST_QR', (req) => (typeof req.params.outletId === 'string' ? req.params.outletId : null)),
  validate(guestMenuValidationSchema),
  getGuestMenuController,
);

router.post(
  '/outlets/:outletId/guest/orders',
  guestWriteRateLimit,
  requireFeatureFlagForOutletParam('GUEST_QR', (req) => (typeof req.params.outletId === 'string' ? req.params.outletId : null)),
  validate(createGuestOrderValidationSchema),
  createGuestOrderController,
);

export default router;

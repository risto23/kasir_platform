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

const router = Router();

router.get(
  '/outlets/:outletId/guest/menu',
  requireFeatureFlagForOutletParam('GUEST_QR', (req) => (typeof req.params.outletId === 'string' ? req.params.outletId : null)),
  (req, _res, next) => {
    console.log('[guest.routes] GET guest menu hit', {
      params: req.params,
      query: req.query,
      authorization: req.headers.authorization ?? null,
    });
    next();
  },
  validate(guestMenuValidationSchema),
  getGuestMenuController,
);

router.post(
  '/outlets/:outletId/guest/orders',
  requireFeatureFlagForOutletParam('GUEST_QR', (req) => (typeof req.params.outletId === 'string' ? req.params.outletId : null)),
  (req, _res, next) => {
    console.log('[guest.routes] POST guest order hit', {
      params: req.params,
      query: req.query,
      body: req.body,
      authorization: req.headers.authorization ?? null,
    });
    next();
  },
  validate(createGuestOrderValidationSchema),
  createGuestOrderController,
);

export default router;

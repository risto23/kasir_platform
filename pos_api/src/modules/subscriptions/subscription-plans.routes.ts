import { Router } from 'express';
import { z } from 'zod';
import { PlatformRoleCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePlatformRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  activateSubscriptionPlanAdminController,
  createSubscriptionPlanAdminController,
  deactivateSubscriptionPlanAdminController,
  getSubscriptionPlanAdminController,
  getSubscriptionPlansAdminController,
  updateSubscriptionPlanAdminController,
} from './subscription-plans.controller';
import { createSubscriptionPlanBodySchema, subscriptionPlanIdParamSchema, updateSubscriptionPlanBodySchema } from './subscriptions.validation';

const router = Router();

router.use(authMiddleware);
router.use(requirePlatformRole(PlatformRoleCode.SUPER_ADMIN));

router.get('/', getSubscriptionPlansAdminController);
router.get(
  '/:id',
  validate(z.object({ params: subscriptionPlanIdParamSchema })),
  getSubscriptionPlanAdminController,
);
router.post(
  '/',
  validate(z.object({ body: createSubscriptionPlanBodySchema })),
  createSubscriptionPlanAdminController,
);
router.patch(
  '/:id',
  validate(z.object({ params: subscriptionPlanIdParamSchema, body: updateSubscriptionPlanBodySchema })),
  updateSubscriptionPlanAdminController,
);
router.patch(
  '/:id/activate',
  validate(z.object({ params: subscriptionPlanIdParamSchema })),
  activateSubscriptionPlanAdminController,
);
router.patch(
  '/:id/deactivate',
  validate(z.object({ params: subscriptionPlanIdParamSchema })),
  deactivateSubscriptionPlanAdminController,
);

export default router;

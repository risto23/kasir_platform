import { BusinessRoleCode } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireSubscriptionManagementAccess } from '../../middlewares/subscription-management-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { errorResponse } from '../../utils/api-response';
import {
  cancelSubscriptionController,
  changeSubscriptionPlanController,
  getCurrentSubscriptionController,
  getSubscriptionChangePreviewController,
  getSubscriptionInvoiceDetailController,
  getCurrentSubscriptionUsageController,
  getSubscriptionInvoicesController,
  getSubscriptionPlansController,
  recordSubscriptionInvoicePaymentController,
  reactivateSubscriptionController,
  startSubscriptionController,
} from './subscriptions.controller';
import {
  subscriptionChangePlanBodySchema,
  subscriptionChangePreviewQuerySchema,
  subscriptionInvoiceIdParamSchema,
  subscriptionInvoicePaymentBodySchema,
  subscriptionInvoicesQuerySchema,
  subscriptionLifecycleActionBodySchema,
  subscriptionStartBodySchema,
} from './subscriptions.validation';

const router = Router();

function requireOwnerSubscriptionAccess(
  req: import('express').Request,
  res: import('express').Response,
  next: import('express').NextFunction,
) {
  const businessAccess = req.businessAccess;

  if (!businessAccess) {
    return res
      .status(403)
      .json(errorResponse('Business access context belum tersedia'));
  }

  if (businessAccess.status !== 'ACTIVE') {
    return res.status(403).json(errorResponse('User business tidak aktif'));
  }

  if (businessAccess.role !== BusinessRoleCode.OWNER) {
    return res
      .status(403)
      .json(errorResponse('Hanya owner yang dapat mengakses billing subscription'));
  }

  return next();
}

router.use(authMiddleware);
router.use(businessAccessMiddleware);
router.use(requireOwnerSubscriptionAccess);

router.get('/plans', getSubscriptionPlansController);
router.get('/current', getCurrentSubscriptionController);
router.get('/usage', getCurrentSubscriptionUsageController);
router.get(
  '/change-preview',
  requireSubscriptionManagementAccess,
  validate(z.object({ query: subscriptionChangePreviewQuerySchema })),
  getSubscriptionChangePreviewController,
);
router.get(
  '/invoices',
  validate(z.object({ query: subscriptionInvoicesQuerySchema })),
  getSubscriptionInvoicesController,
);
router.get(
  '/invoices/:id',
  validate(z.object({ params: subscriptionInvoiceIdParamSchema })),
  getSubscriptionInvoiceDetailController,
);
router.post(
  '/invoices/:id/payments',
  validate(
    z.object({
      params: subscriptionInvoiceIdParamSchema,
      body: subscriptionInvoicePaymentBodySchema,
    }),
  ),
  recordSubscriptionInvoicePaymentController,
);
router.post(
  '/change-plan',
  requireSubscriptionManagementAccess,
  validate(z.object({ body: subscriptionChangePlanBodySchema })),
  changeSubscriptionPlanController,
);
router.post(
  '/cancel',
  requireSubscriptionManagementAccess,
  validate(z.object({ body: subscriptionLifecycleActionBodySchema })),
  cancelSubscriptionController,
);
router.post(
  '/reactivate',
  requireSubscriptionManagementAccess,
  validate(z.object({ body: subscriptionLifecycleActionBodySchema })),
  reactivateSubscriptionController,
);
router.post(
  '/start',
  requireSubscriptionManagementAccess,
  validate(z.object({ body: subscriptionStartBodySchema })),
  startSubscriptionController,
);

export default router;

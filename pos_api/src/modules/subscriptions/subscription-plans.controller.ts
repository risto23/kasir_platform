import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import {
  createSubscriptionPlan,
  getSubscriptionPlanById,
  getSubscriptionPlans,
  setSubscriptionPlanActiveStatus,
  updateSubscriptionPlan,
} from './subscriptions.service';
import {
  createSubscriptionPlanBodySchema,
  subscriptionPlanIdParamSchema,
  updateSubscriptionPlanBodySchema,
} from './subscriptions.validation';

export async function getSubscriptionPlansAdminController(
  req: Request,
  res: Response,
) {
  try {
    const result = await getSubscriptionPlans();
    return res.json(successResponse('Subscription plans loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat subscription plans';
    return res.status(400).json(errorResponse(message));
  }
}

export async function getSubscriptionPlanAdminController(
  req: Request,
  res: Response,
) {
  try {
    const parsed = subscriptionPlanIdParamSchema.parse(req.params);
    const result = await getSubscriptionPlanById(parsed.id);
    return res.json(successResponse('Subscription plan loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat subscription plan';
    const status =
      error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
    return res.status(status).json(errorResponse(message));
  }
}

export async function createSubscriptionPlanAdminController(
  req: Request,
  res: Response,
) {
  try {
    const parsed = createSubscriptionPlanBodySchema.parse(req.body);
    const result = await createSubscriptionPlan(parsed);
    return res.status(201).json(successResponse('Subscription plan created', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal membuat subscription plan';
    return res.status(400).json(errorResponse(message));
  }
}

export async function updateSubscriptionPlanAdminController(
  req: Request,
  res: Response,
) {
  try {
    const params = subscriptionPlanIdParamSchema.parse(req.params);
    const body = updateSubscriptionPlanBodySchema.parse(req.body);
    const result = await updateSubscriptionPlan({
      planId: params.id,
      ...body,
    });
    return res.json(successResponse('Subscription plan updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memperbarui subscription plan';
    const status =
      error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
    return res.status(status).json(errorResponse(message));
  }
}

export async function activateSubscriptionPlanAdminController(
  req: Request,
  res: Response,
) {
  try {
    const params = subscriptionPlanIdParamSchema.parse(req.params);
    const result = await setSubscriptionPlanActiveStatus({
      planId: params.id,
      isActive: true,
    });
    return res.json(successResponse('Subscription plan activated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal mengaktifkan subscription plan';
    const status =
      error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
    return res.status(status).json(errorResponse(message));
  }
}

export async function deactivateSubscriptionPlanAdminController(
  req: Request,
  res: Response,
) {
  try {
    const params = subscriptionPlanIdParamSchema.parse(req.params);
    const result = await setSubscriptionPlanActiveStatus({
      planId: params.id,
      isActive: false,
    });
    return res.json(successResponse('Subscription plan deactivated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal menonaktifkan subscription plan';
    const status =
      error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
    return res.status(status).json(errorResponse(message));
  }
}

import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import { recordSubscriptionInvoicePayment } from './subscription-billing.service';
import {
  cancelSubscriptionByBusiness,
  changeSubscriptionPlanByBusiness,
  getCurrentSubscriptionByBusiness,
  getCurrentUsageByBusiness,
  getSubscriptionChangePreviewByBusiness,
  getSubscriptionInvoiceDetailByBusiness,
  getSubscriptionInvoicesByBusiness,
  getSubscriptionPlansByBusinessType,
  reactivateSubscriptionByBusiness,
  startSubscriptionByBusiness,
} from './subscriptions.service';
import {
  subscriptionChangePlanBodySchema,
  subscriptionChangePreviewQuerySchema,
  subscriptionInvoiceIdParamSchema,
  subscriptionInvoicePaymentBodySchema,
  subscriptionInvoicesQuerySchema,
  subscriptionLifecycleActionBodySchema,
  subscriptionStartBodySchema,
} from './subscriptions.validation';

function getBusinessAccessOrThrow(req: Request) {
  const businessAccess = req.businessAccess;

  if (!businessAccess) {
    throw new Error('Business access context belum tersedia');
  }

  return businessAccess;
}

function resolveErrorStatus(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }

  const message = error instanceof Error ? error.message : '';

  if (message.includes('tidak ditemukan')) {
    return 404;
  }

  return 400;
}

export async function getSubscriptionPlansController(req: Request, res: Response) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const result = await getSubscriptionPlansByBusinessType(businessAccess.businessType);

    return res.json(successResponse('Subscription plans loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat subscription plans';
    return res.status(resolveErrorStatus(error)).json(errorResponse(message));
  }
}

export async function getCurrentSubscriptionController(req: Request, res: Response) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const result = await getCurrentSubscriptionByBusiness(businessAccess.businessId);

    return res.json(successResponse('Current subscription loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat subscription aktif';
    return res.status(resolveErrorStatus(error)).json(errorResponse(message));
  }
}

export async function getCurrentSubscriptionUsageController(
  req: Request,
  res: Response,
) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const result = await getCurrentUsageByBusiness(businessAccess.businessId);

    return res.json(successResponse('Subscription usage loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat usage subscription';
    return res.status(resolveErrorStatus(error)).json(errorResponse(message));
  }
}

export async function getSubscriptionInvoicesController(req: Request, res: Response) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const parsed = subscriptionInvoicesQuerySchema.parse(req.query);
    const result = await getSubscriptionInvoicesByBusiness({
      businessId: businessAccess.businessId,
      page: parsed.page ?? 1,
      perPage: parsed.perPage ?? 10,
    });

    return res.json(successResponse('Subscription invoices loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat invoice subscription';
    return res.status(resolveErrorStatus(error)).json(errorResponse(message));
  }
}

export async function getSubscriptionInvoiceDetailController(
  req: Request,
  res: Response,
) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const parsed = subscriptionInvoiceIdParamSchema.parse(req.params);
    const result = await getSubscriptionInvoiceDetailByBusiness({
      businessId: businessAccess.businessId,
      invoiceId: parsed.id,
    });

    return res.json(successResponse('Subscription invoice detail loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat detail invoice subscription';
    return res.status(resolveErrorStatus(error)).json(errorResponse(message));
  }
}

export async function getSubscriptionChangePreviewController(
  req: Request,
  res: Response,
) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const parsed = subscriptionChangePreviewQuerySchema.parse(req.query);
    const result = await getSubscriptionChangePreviewByBusiness({
      businessId: businessAccess.businessId,
      targetPlanCode: parsed.targetPlanCode,
    });

    return res.json(successResponse('Subscription plan change preview loaded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat preview perubahan plan';
    return res.status(resolveErrorStatus(error)).json(errorResponse(message));
  }
}

export async function changeSubscriptionPlanController(req: Request, res: Response) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const parsed = subscriptionChangePlanBodySchema.parse(req.body);
    const result = await changeSubscriptionPlanByBusiness({
      businessId: businessAccess.businessId,
      targetPlanCode: parsed.targetPlanCode,
    });

    return res.json(successResponse('Subscription plan change saved', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memproses perubahan plan';
    const errors =
      error && typeof error === 'object' && 'errors' in error
        ? (error as { errors?: unknown }).errors
        : undefined;
    return res.status(resolveErrorStatus(error)).json(errorResponse(message, errors));
  }
}

export async function recordSubscriptionInvoicePaymentController(
  req: Request,
  res: Response,
) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const params = subscriptionInvoiceIdParamSchema.parse(req.params);
    const body = subscriptionInvoicePaymentBodySchema.parse(req.body);
    const result = await recordSubscriptionInvoicePayment({
      businessId: businessAccess.businessId,
      invoiceId: params.id,
      method: body.method,
      amount: body.amount,
      referenceNumber: body.referenceNumber ?? null,
      paidAt: body.paidAt,
    });

    return res.json(successResponse('Subscription invoice payment recorded', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal mencatat pembayaran invoice subscription';
    const errors =
      error && typeof error === 'object' && 'errors' in error
        ? (error as { errors?: unknown }).errors
        : undefined;
    return res.status(resolveErrorStatus(error)).json(errorResponse(message, errors));
  }
}

export async function cancelSubscriptionController(req: Request, res: Response) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    subscriptionLifecycleActionBodySchema.parse(req.body);
    const result = await cancelSubscriptionByBusiness({
      businessId: businessAccess.businessId,
    });

    return res.json(successResponse('Subscription cancellation scheduled', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal menjadwalkan penghentian subscription';
    const errors =
      error && typeof error === 'object' && 'errors' in error
        ? (error as { errors?: unknown }).errors
        : undefined;
    return res.status(resolveErrorStatus(error)).json(errorResponse(message, errors));
  }
}

export async function reactivateSubscriptionController(req: Request, res: Response) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    subscriptionLifecycleActionBodySchema.parse(req.body);
    const result = await reactivateSubscriptionByBusiness({
      businessId: businessAccess.businessId,
    });

    return res.json(successResponse('Subscription reactivated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal mengaktifkan kembali subscription';
    const errors =
      error && typeof error === 'object' && 'errors' in error
        ? (error as { errors?: unknown }).errors
        : undefined;
    return res.status(resolveErrorStatus(error)).json(errorResponse(message, errors));
  }
}

export async function startSubscriptionController(req: Request, res: Response) {
  try {
    const businessAccess = getBusinessAccessOrThrow(req);
    const parsed = subscriptionStartBodySchema.parse(req.body);
    const result = await startSubscriptionByBusiness({
      businessId: businessAccess.businessId,
      targetPlanCode: parsed.targetPlanCode,
    });

    return res.json(successResponse('Subscription started', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memulai subscription baru';
    const errors =
      error && typeof error === 'object' && 'errors' in error
        ? (error as { errors?: unknown }).errors
        : undefined;
    return res.status(resolveErrorStatus(error)).json(errorResponse(message, errors));
  }
}

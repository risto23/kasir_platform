// pos_api/src/modules/payments/payment.controller.ts
import type { Request, Response, NextFunction } from 'express';
import { createPayment, getPaymentById, listPayments, softDeletePayment } from './payment.service';
import type {
  CreatePaymentBody,
  GetPaymentParams,
  GetPaymentQuery,
  ListPaymentsQuery,
} from './payment.types';
import {
  createPaymentSchema,
  getPaymentByIdSchema,
  listPaymentsSchema,
} from './payment.validation';

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function getBusinessIdFromRequest(req: Request): string {
  const businessId =
    req.businessAccess?.businessId ||
    (typeof req.headers['x-business-id'] === 'string'
      ? req.headers['x-business-id'].trim()
      : '');

  if (!businessId) {
    throw createHttpError(
      'Business context tidak ditemukan. Kirim header x-business-id.',
      400,
    );
  }

  return businessId;
}

function getBusinessUserIdFromRequest(req: Request): string {
  const businessUserId = req.businessAccess?.businessUserId;

  if (!businessUserId) {
    throw createHttpError('Business user context tidak ditemukan.', 400);
  }

  return businessUserId;
}

function parseListPaymentsQuery(req: Request): ListPaymentsQuery {
  const parsed = listPaymentsSchema.parse({
    query: req.query,
    body: {},
    params: {},
  });

  return {
    businessId: '',
    outletId: parsed.query.outletId,
    page: parsed.query.page ?? 1,
    perPage: parsed.query.perPage ?? 10,
    orderId: parsed.query.orderId,
    status: parsed.query.status,
  };
}

function parseGetPaymentParams(req: Request): GetPaymentParams {
  const parsed = getPaymentByIdSchema.parse({
    params: req.params,
    query: req.query,
    body: {},
  });

  return {
    id: parsed.params.id,
  };
}

function parseGetPaymentQuery(req: Request): GetPaymentQuery {
  const parsed = getPaymentByIdSchema.parse({
    params: req.params,
    query: req.query,
    body: {},
  });

  if (!parsed.query.outletId) {
    throw createHttpError('outletId wajib diisi', 400);
  }

  return {
    outletId: parsed.query.outletId,
  };
}

function parseCreatePaymentBody(req: Request): CreatePaymentBody {
  const parsed = createPaymentSchema.parse({
    body: req.body,
    query: {},
    params: {},
  });

  return {
    orderId: parsed.body.orderId,
    outletId: parsed.body.outletId,
    method: parsed.body.method,
    amountPaid: parsed.body.amountPaid,
    amountTendered: parsed.body.amountTendered,
    note: parsed.body.note,
  };
}

export async function listPaymentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const query = parseListPaymentsQuery(req);

    const result = await listPayments({
      businessId,
      outletId: query.outletId,
      page: query.page,
      perPage: query.perPage,
      orderId: query.orderId,
      status: query.status,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar pembayaran berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getPaymentByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = parseGetPaymentParams(req);
    const query = parseGetPaymentQuery(req);

    const result = await getPaymentById({
      businessId,
      outletId: query.outletId,
      paymentId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail pembayaran berhasil diambil.',
      data: result,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function createPaymentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const body = parseCreatePaymentBody(req);

    const result = await createPayment({
      businessId,
      outletId: body.outletId,
      businessUserId,
      orderId: body.orderId,
      method: body.method,
      amountPaid: body.amountPaid,
      amountTendered: body.amountTendered,
      note: body.note,
    });

    return res.status(201).json({
      success: true,
      message: 'Pembayaran berhasil dibuat.',
      data: result,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function deletePaymentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const paymentId = req.params['id'] as string;
    const outletId =
      (req.query['outletId'] as string) ||
      (req.headers['x-outlet-id'] as string) ||
      '';

    if (!outletId) {
      throw createHttpError('outletId wajib diisi', 400);
    }

    await softDeletePayment({ businessId, outletId, paymentId });

    return res.status(200).json({
      success: true,
      message: 'Payment berhasil dihapus.',
    });
  } catch (error: unknown) {
    return next(error);
  }
}
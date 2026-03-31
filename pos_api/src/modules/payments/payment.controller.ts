import type { Request, Response, NextFunction } from 'express';
import {
  createPayment,
  getPaymentById,
  listPayments,
} from './payment.service';
import type {
  CreatePaymentBody,
  GetPaymentParams,
  GetPaymentQuery,
  ListPaymentsQuery,
} from './payment.types';

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function getBusinessIdFromRequest(req: Request) {
  const businessId =
    req.businessAccess?.businessId ||
    (typeof req.headers['x-business-id'] === 'string'
      ? req.headers['x-business-id']
      : undefined);

  if (!businessId) {
    throw createHttpError(
      'Business context tidak ditemukan. Kirim header x-business-id.',
      400,
    );
  }

  return businessId;
}

function getBusinessUserIdFromRequest(req: Request) {
  const businessUserId = req.businessAccess?.businessUserId;

  if (!businessUserId) {
    throw createHttpError('Business user context tidak ditemukan.', 400);
  }

  return businessUserId;
}

export async function listPaymentsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const query = res.locals.validatedQuery as ListPaymentsQuery;

    const result = await listPayments({
      businessId,
      outletId: query.outletId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 10,
      orderId: query.orderId,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar pembayaran berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
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
    const params = res.locals.validatedParams as GetPaymentParams;
    const query = res.locals.validatedQuery as GetPaymentQuery;

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
  } catch (error) {
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
    const body = res.locals.validatedBody as CreatePaymentBody;

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
  } catch (error) {
    return next(error);
  }
}
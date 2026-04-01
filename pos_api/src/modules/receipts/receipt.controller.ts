import type { Request, Response, NextFunction } from 'express';
import { getReceiptById, getReceiptByOrderId } from './receipt.service';
import type {
  GetReceiptParams,
  GetReceiptByOrderParams,
  GetReceiptQuery,
} from './receipt.types';
import {
  getReceiptByIdSchema,
  getReceiptByOrderIdSchema,
} from './receipt.validation';

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

function parseGetReceiptParams(req: Request): GetReceiptParams {
  const parsed = getReceiptByIdSchema.parse({
    params: req.params,
    query: req.query,
    body: {},
  });

  return {
    id: parsed.params.id,
  };
}

function parseGetReceiptByOrderParams(req: Request): GetReceiptByOrderParams {
  const parsed = getReceiptByOrderIdSchema.parse({
    params: req.params,
    query: req.query,
    body: {},
  });

  return {
    orderId: parsed.params.orderId,
  };
}

function parseReceiptQueryForById(req: Request): GetReceiptQuery {
  const parsed = getReceiptByIdSchema.parse({
    params: req.params,
    query: req.query,
    body: {},
  });

  return {
    outletId: parsed.query.outletId,
  };
}

function parseReceiptQueryForByOrder(req: Request): GetReceiptQuery {
  const parsed = getReceiptByOrderIdSchema.parse({
    params: req.params,
    query: req.query,
    body: {},
  });

  return {
    outletId: parsed.query.outletId,
  };
}

function getOutletIdFromRequest(req: Request, query: GetReceiptQuery): string {
  if (typeof query.outletId === 'string' && query.outletId.trim() !== '') {
    return query.outletId.trim();
  }

  const headerOutletId = req.headers['x-outlet-id'];
  if (typeof headerOutletId === 'string' && headerOutletId.trim() !== '') {
    return headerOutletId.trim();
  }

  throw createHttpError(
    'Outlet context tidak ditemukan. Kirim query outletId atau header x-outlet-id.',
    400,
  );
}

export async function getReceiptByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = parseGetReceiptParams(req);
    const query = parseReceiptQueryForById(req);
    const outletId = getOutletIdFromRequest(req, query);

    const result = await getReceiptById({
      businessId,
      outletId,
      receiptId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail receipt berhasil diambil.',
      data: result,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getReceiptByOrderIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = parseGetReceiptByOrderParams(req);
    const query = parseReceiptQueryForByOrder(req);
    const outletId = getOutletIdFromRequest(req, query);

    const result = await getReceiptByOrderId({
      businessId,
      outletId,
      orderId: params.orderId,
    });

    return res.status(200).json({
      success: true,
      message: 'Receipt order berhasil diambil.',
      data: result,
    });
  } catch (error: unknown) {
    return next(error);
  }
}
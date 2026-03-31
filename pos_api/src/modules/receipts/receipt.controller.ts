import type { Request, Response, NextFunction } from 'express';
import { getReceiptById, getReceiptByOrderId } from './receipt.service';
import type {
  GetReceiptParams,
  GetReceiptByOrderParams,
  GetReceiptQuery,
} from './receipt.types';

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

function getOutletIdFromRequest(
  req: Request,
  query: GetReceiptQuery,
) {
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
    const params = res.locals.validatedParams as GetReceiptParams;
    const query = res.locals.validatedQuery as GetReceiptQuery;
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
  } catch (error) {
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
    const params = res.locals.validatedParams as GetReceiptByOrderParams;
    const query = res.locals.validatedQuery as GetReceiptQuery;
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
  } catch (error) {
    return next(error);
  }
}
import type { NextFunction, Request, Response } from 'express';
import { listPurchasePriceHistory } from './purchase-price-history.service';
import type { ListPurchasePriceHistoryQuery } from './purchase-price-history.types';
import { listPurchasePriceHistorySchema } from './purchase-price-history.validation';

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function getBusinessIdFromRequest(req: Request): string {
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

function parseListPurchasePriceHistoryRequest(req: Request): {
  query: ListPurchasePriceHistoryQuery;
} {
  const parsed = listPurchasePriceHistorySchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    query: parsed.query,
  };
}

export async function listPurchasePriceHistoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { query } = parseListPurchasePriceHistoryRequest(req);

    const result = await listPurchasePriceHistory({
      businessId,
      outletId: query.outletId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 10,
      search: query.search,
      supplierId: query.supplierId,
      productId: query.productId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    return res.status(200).json({
      success: true,
      message: 'Histori harga beli berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

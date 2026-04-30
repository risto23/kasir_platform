import type { NextFunction, Request, Response } from 'express';
import {
  createGoodsReceipt,
  getGoodsReceiptById,
  listGoodsReceipts,
  postGoodsReceipt,
  updateGoodsReceipt,
  voidGoodsReceipt,
} from './goods-receipts.service';
import type {
  CreateGoodsReceiptBody,
  GetGoodsReceiptParams,
  GetGoodsReceiptQuery,
  GoodsReceiptActionBody,
  ListGoodsReceiptsQuery,
  UpdateGoodsReceiptBody,
} from './goods-receipts.types';
import {
  createGoodsReceiptSchema,
  getGoodsReceiptByIdSchema,
  goodsReceiptActionSchema,
  listGoodsReceiptsSchema,
  updateGoodsReceiptSchema,
} from './goods-receipts.validation';

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

function getBusinessUserIdFromRequest(req: Request): string {
  const businessUserId = req.businessAccess?.businessUserId;

  if (!businessUserId) {
    throw createHttpError('Business user context tidak ditemukan.', 400);
  }

  return businessUserId;
}

function parseListGoodsReceiptsRequest(req: Request): {
  query: ListGoodsReceiptsQuery;
} {
  const parsed = listGoodsReceiptsSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    query: parsed.query,
  };
}

function parseGetGoodsReceiptByIdRequest(req: Request): {
  params: GetGoodsReceiptParams;
  query: GetGoodsReceiptQuery;
} {
  const parsed = getGoodsReceiptByIdSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    query: parsed.query,
  };
}

function parseCreateGoodsReceiptRequest(req: Request): {
  body: CreateGoodsReceiptBody;
} {
  const parsed = createGoodsReceiptSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    body: parsed.body,
  };
}

function parseUpdateGoodsReceiptRequest(req: Request): {
  params: GetGoodsReceiptParams;
  body: UpdateGoodsReceiptBody;
} {
  const parsed = updateGoodsReceiptSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseGoodsReceiptActionRequest(req: Request): {
  params: GetGoodsReceiptParams;
  body: GoodsReceiptActionBody;
} {
  const parsed = goodsReceiptActionSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

export async function listGoodsReceiptsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { query } = parseListGoodsReceiptsRequest(req);

    const result = await listGoodsReceipts({
      businessId,
      outletId: query.outletId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 10,
      search: query.search,
      status: query.status,
      supplierId: query.supplierId,
      purchaseOrderId: query.purchaseOrderId,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar goods receipt berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getGoodsReceiptByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, query } = parseGetGoodsReceiptByIdRequest(req);

    if (!query.outletId) {
      throw createHttpError('outletId wajib diisi', 400);
    }

    const result = await getGoodsReceiptById({
      businessId,
      outletId: query.outletId,
      goodsReceiptId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail goods receipt berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createGoodsReceiptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { body } = parseCreateGoodsReceiptRequest(req);

    const result = await createGoodsReceipt({
      businessId,
      businessUserId,
      outletId: body.outletId,
      supplierId: body.supplierId,
      purchaseOrderId: body.purchaseOrderId,
      receiptDate: body.receiptDate,
      supplierInvoiceNumber: body.supplierInvoiceNumber,
      notes: body.notes,
      items: body.items,
    });

    return res.status(201).json({
      success: true,
      message: 'Goods receipt berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateGoodsReceiptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdateGoodsReceiptRequest(req);

    const result = await updateGoodsReceipt({
      businessId,
      goodsReceiptId: params.id,
      outletId: body.outletId,
      supplierId: body.supplierId,
      purchaseOrderId: body.purchaseOrderId,
      receiptDate: body.receiptDate,
      supplierInvoiceNumber: body.supplierInvoiceNumber,
      notes: body.notes,
      items: body.items,
    });

    return res.status(200).json({
      success: true,
      message: 'Goods receipt berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function postGoodsReceiptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { params, body } = parseGoodsReceiptActionRequest(req);

    const result = await postGoodsReceipt({
      businessId,
      goodsReceiptId: params.id,
      outletId: body.outletId,
      postedByBusinessUserId: businessUserId,
    });

    return res.status(200).json({
      success: true,
      message: 'Goods receipt berhasil diposting.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function voidGoodsReceiptHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseGoodsReceiptActionRequest(req);

    const result = await voidGoodsReceipt({
      businessId,
      goodsReceiptId: params.id,
      outletId: body.outletId,
    });

    return res.status(200).json({
      success: true,
      message: 'Goods receipt berhasil dibatalkan.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

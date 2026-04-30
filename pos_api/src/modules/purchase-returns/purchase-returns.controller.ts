import type { NextFunction, Request, Response } from 'express';
import {
  createPurchaseReturn,
  getPurchaseReturnById,
  listPurchaseReturns,
  postPurchaseReturn,
  updatePurchaseReturn,
  voidPurchaseReturn,
} from './purchase-returns.service';
import type {
  CreatePurchaseReturnBody,
  GetPurchaseReturnParams,
  GetPurchaseReturnQuery,
  ListPurchaseReturnsQuery,
  PurchaseReturnActionBody,
  UpdatePurchaseReturnBody,
} from './purchase-returns.types';
import {
  createPurchaseReturnSchema,
  getPurchaseReturnByIdSchema,
  listPurchaseReturnsSchema,
  purchaseReturnActionSchema,
  updatePurchaseReturnSchema,
} from './purchase-returns.validation';

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

function parseListPurchaseReturnsRequest(req: Request): {
  query: ListPurchaseReturnsQuery;
} {
  const parsed = listPurchaseReturnsSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    query: parsed.query,
  };
}

function parseGetPurchaseReturnByIdRequest(req: Request): {
  params: GetPurchaseReturnParams;
  query: GetPurchaseReturnQuery;
} {
  const parsed = getPurchaseReturnByIdSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    query: parsed.query,
  };
}

function parseCreatePurchaseReturnRequest(req: Request): {
  body: CreatePurchaseReturnBody;
} {
  const parsed = createPurchaseReturnSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    body: parsed.body,
  };
}

function parseUpdatePurchaseReturnRequest(req: Request): {
  params: GetPurchaseReturnParams;
  body: UpdatePurchaseReturnBody;
} {
  const parsed = updatePurchaseReturnSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parsePurchaseReturnActionRequest(req: Request): {
  params: GetPurchaseReturnParams;
  body: PurchaseReturnActionBody;
} {
  const parsed = purchaseReturnActionSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

export async function listPurchaseReturnsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { query } = parseListPurchaseReturnsRequest(req);

    const result = await listPurchaseReturns({
      businessId,
      outletId: query.outletId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 10,
      search: query.search,
      status: query.status,
      supplierId: query.supplierId,
      goodsReceiptId: query.goodsReceiptId,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar purchase return berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPurchaseReturnByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, query } = parseGetPurchaseReturnByIdRequest(req);

    if (!query.outletId) {
      throw createHttpError('outletId wajib diisi', 400);
    }

    const result = await getPurchaseReturnById({
      businessId,
      outletId: query.outletId,
      purchaseReturnId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail purchase return berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createPurchaseReturnHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { body } = parseCreatePurchaseReturnRequest(req);

    const result = await createPurchaseReturn({
      businessId,
      businessUserId,
      outletId: body.outletId,
      goodsReceiptId: body.goodsReceiptId,
      returnDate: body.returnDate,
      reason: body.reason,
      notes: body.notes,
      items: body.items,
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase return berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePurchaseReturnHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdatePurchaseReturnRequest(req);

    const result = await updatePurchaseReturn({
      businessId,
      purchaseReturnId: params.id,
      outletId: body.outletId,
      goodsReceiptId: body.goodsReceiptId,
      returnDate: body.returnDate,
      reason: body.reason,
      notes: body.notes,
      items: body.items,
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase return berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function postPurchaseReturnHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { params, body } = parsePurchaseReturnActionRequest(req);

    const result = await postPurchaseReturn({
      businessId,
      purchaseReturnId: params.id,
      outletId: body.outletId,
      postedByBusinessUserId: businessUserId,
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase return berhasil diposting.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function voidPurchaseReturnHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parsePurchaseReturnActionRequest(req);

    const result = await voidPurchaseReturn({
      businessId,
      purchaseReturnId: params.id,
      outletId: body.outletId,
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase return berhasil dibatalkan.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

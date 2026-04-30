import type { NextFunction, Request, Response } from 'express';
import {
  createPurchaseOrder,
  getPurchaseOrderById,
  listPurchaseOrders,
  updatePurchaseOrder,
  updatePurchaseOrderStatus,
} from './purchase-orders.service';
import type {
  CreatePurchaseOrderBody,
  GetPurchaseOrderParams,
  GetPurchaseOrderQuery,
  ListPurchaseOrdersQuery,
  UpdatePurchaseOrderBody,
  UpdatePurchaseOrderStatusBody,
} from './purchase-orders.types';
import {
  createPurchaseOrderSchema,
  getPurchaseOrderByIdSchema,
  listPurchaseOrdersSchema,
  updatePurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
} from './purchase-orders.validation';

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

function parseListPurchaseOrdersRequest(req: Request): {
  query: ListPurchaseOrdersQuery;
} {
  const parsed = listPurchaseOrdersSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    query: parsed.query,
  };
}

function parseGetPurchaseOrderByIdRequest(req: Request): {
  params: GetPurchaseOrderParams;
  query: GetPurchaseOrderQuery;
} {
  const parsed = getPurchaseOrderByIdSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    query: parsed.query,
  };
}

function parseCreatePurchaseOrderRequest(req: Request): {
  body: CreatePurchaseOrderBody;
} {
  const parsed = createPurchaseOrderSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    body: parsed.body,
  };
}

function parseUpdatePurchaseOrderRequest(req: Request): {
  params: GetPurchaseOrderParams;
  body: UpdatePurchaseOrderBody;
} {
  const parsed = updatePurchaseOrderSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseUpdatePurchaseOrderStatusRequest(req: Request): {
  params: GetPurchaseOrderParams;
  body: UpdatePurchaseOrderStatusBody;
} {
  const parsed = updatePurchaseOrderStatusSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

export async function listPurchaseOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { query } = parseListPurchaseOrdersRequest(req);

    const result = await listPurchaseOrders({
      businessId,
      outletId: query.outletId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 10,
      search: query.search,
      status: query.status,
      supplierId: query.supplierId,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar purchase order berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPurchaseOrderByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, query } = parseGetPurchaseOrderByIdRequest(req);

    if (!query.outletId) {
      throw createHttpError('outletId wajib diisi', 400);
    }

    const result = await getPurchaseOrderById({
      businessId,
      outletId: query.outletId,
      purchaseOrderId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail purchase order berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createPurchaseOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { body } = parseCreatePurchaseOrderRequest(req);

    const result = await createPurchaseOrder({
      businessId,
      businessUserId,
      outletId: body.outletId,
      supplierId: body.supplierId,
      orderDate: body.orderDate,
      expectedDate: body.expectedDate,
      notes: body.notes,
      items: body.items,
    });

    return res.status(201).json({
      success: true,
      message: 'Purchase order berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePurchaseOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdatePurchaseOrderRequest(req);

    const result = await updatePurchaseOrder({
      businessId,
      purchaseOrderId: params.id,
      outletId: body.outletId,
      supplierId: body.supplierId,
      orderDate: body.orderDate,
      expectedDate: body.expectedDate,
      notes: body.notes,
      items: body.items,
    });

    return res.status(200).json({
      success: true,
      message: 'Purchase order berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updatePurchaseOrderStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdatePurchaseOrderStatusRequest(req);

    const result = await updatePurchaseOrderStatus({
      businessId,
      purchaseOrderId: params.id,
      outletId: body.outletId,
      status: body.status,
    });

    return res.status(200).json({
      success: true,
      message: 'Status purchase order berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

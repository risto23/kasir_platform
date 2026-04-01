import type { NextFunction, Request, Response } from 'express';
import {
  addOrderItem,
  createOrder,
  getOrderById,
  listOrders,
  updateOrderItem,
  updateOrderStatus,
} from './order.service';
import type {
  AddOrderItemBody,
  CreateOrderBody,
  GetOrderParams,
  GetOrderQuery,
  ListOrdersQuery,
  UpdateOrderItemBody,
  UpdateOrderItemParams,
  UpdateOrderStatusBody,
} from './order.types';
import {
  addOrderItemSchema,
  createOrderSchema,
  getOrderByIdSchema,
  listOrdersSchema,
  updateOrderItemSchema,
  updateOrderStatusSchema,
} from './order.validation';

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

function parseListOrdersRequest(req: Request): {
  query: ListOrdersQuery;
} {
  const parsed = listOrdersSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    query: parsed.query,
  };
}

function parseGetOrderByIdRequest(req: Request): {
  params: GetOrderParams;
  query: GetOrderQuery;
} {
  const parsed = getOrderByIdSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    query: parsed.query,
  };
}

function parseCreateOrderRequest(req: Request): {
  body: CreateOrderBody;
} {
  const parsed = createOrderSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    body: parsed.body,
  };
}

function parseAddOrderItemRequest(req: Request): {
  params: GetOrderParams;
  body: AddOrderItemBody;
} {
  const parsed = addOrderItemSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseUpdateOrderItemRequest(req: Request): {
  params: UpdateOrderItemParams;
  body: UpdateOrderItemBody;
} {
  const parsed = updateOrderItemSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseUpdateOrderStatusRequest(req: Request): {
  params: GetOrderParams;
  body: UpdateOrderStatusBody;
} {
  const parsed = updateOrderStatusSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { query } = parseListOrdersRequest(req);

    const result = await listOrders({
      businessId,
      outletId: query.outletId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 10,
      search: query.search,
      status: query.status,
      paymentStatus: query.paymentStatus,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar order berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getOrderByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, query } = parseGetOrderByIdRequest(req);

    if (!query.outletId) {
      throw createHttpError('outletId wajib diisi', 400);
    }

    const result = await getOrderById({
      businessId,
      outletId: query.outletId,
      orderId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail order berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createOrderHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { body } = parseCreateOrderRequest(req);

    const result = await createOrder({
      businessId,
      outletId: body.outletId,
      businessUserId,
      tableId: body.tableId,
      notes: body.notes,
      items: body.items,
    });

    return res.status(201).json({
      success: true,
      message: 'Order berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function addOrderItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseAddOrderItemRequest(req);

    const result = await addOrderItem({
      businessId,
      outletId: body.outletId,
      orderId: params.id,
      productId: body.productId,
      quantity: body.quantity,
      note: body.note,
    });

    return res.status(200).json({
      success: true,
      message: 'Item order berhasil ditambahkan.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateOrderItemHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdateOrderItemRequest(req);

    const result = await updateOrderItem({
      businessId,
      outletId: body.outletId,
      orderId: params.id,
      itemId: params.itemId,
      quantity: body.quantity,
      note: body.note,
    });

    return res.status(200).json({
      success: true,
      message: 'Item order berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateOrderStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdateOrderStatusRequest(req);

    const result = await updateOrderStatus({
      businessId,
      outletId: body.outletId,
      orderId: params.id,
      status: body.status,
    });

    return res.status(200).json({
      success: true,
      message: 'Status order berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
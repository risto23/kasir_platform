import type { Request, Response, NextFunction } from 'express';
import {
  addOrderItem,
  createOrder,
  getOrderById,
  listOrders,
  updateOrderItem,
  updateOrderStatus,
} from './order.service';
import type {
  CreateOrderBody,
  AddOrderItemBody,
  UpdateOrderItemBody,
  UpdateOrderStatusBody,
  GetOrderParams,
  GetOrderQuery,
  ListOrdersQuery,
  UpdateOrderItemParams,
} from './order.types';

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

export async function listOrdersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const query = res.locals.validatedQuery as ListOrdersQuery;

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
    const params = res.locals.validatedParams as GetOrderParams;
    const query = res.locals.validatedQuery as GetOrderQuery;

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
    const body = res.locals.validatedBody as CreateOrderBody;

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
    const params = res.locals.validatedParams as GetOrderParams;
    const body = res.locals.validatedBody as AddOrderItemBody;

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
    const params = res.locals.validatedParams as UpdateOrderItemParams;
    const body = res.locals.validatedBody as UpdateOrderItemBody;

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
    const params = res.locals.validatedParams as GetOrderParams;
    const body = res.locals.validatedBody as UpdateOrderStatusBody;

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
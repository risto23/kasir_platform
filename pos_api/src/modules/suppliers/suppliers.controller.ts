import type { NextFunction, Request, Response } from 'express';
import type {
  CreateSupplierBody,
  SupplierListQuery,
  SupplierParams,
  UpdateSupplierBody,
  UpdateSupplierStatusBody,
} from './suppliers.types';
import {
  createSupplier,
  getSupplierDetail,
  listSuppliers,
  updateSupplier,
  updateSupplierStatus,
} from './suppliers.service';

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

export async function listSuppliersHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const query = res.locals.validatedQuery as SupplierListQuery;

    const result = await listSuppliers(businessId, query);

    return res.status(200).json({
      success: true,
      message: 'Daftar supplier berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSupplierDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as SupplierParams;

    const result = await getSupplierDetail(businessId, params);

    return res.status(200).json({
      success: true,
      message: 'Detail supplier berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createSupplierHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const body = res.locals.validatedBody as CreateSupplierBody;

    const result = await createSupplier(businessId, body);

    return res.status(201).json({
      success: true,
      message: 'Supplier berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSupplierHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as SupplierParams;
    const body = res.locals.validatedBody as UpdateSupplierBody;

    const result = await updateSupplier(businessId, params, body);

    return res.status(200).json({
      success: true,
      message: 'Supplier berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSupplierStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as SupplierParams;
    const body = res.locals.validatedBody as UpdateSupplierStatusBody;

    const result = await updateSupplierStatus(businessId, params, body);

    return res.status(200).json({
      success: true,
      message: 'Status supplier berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

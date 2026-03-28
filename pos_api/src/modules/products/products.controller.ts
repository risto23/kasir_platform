import type { Request, Response, NextFunction } from 'express';
import type {
  ProductListQuery,
  ProductParams,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductStatusBody,
} from './products.types';
import {
  listProducts,
  getProductDetail,
  createProduct,
  updateProduct,
  updateProductStatus,
} from './products.service';

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

export async function listProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const query = res.locals.validatedQuery as ProductListQuery;

    const result = await listProducts(businessId, query);

    return res.status(200).json({
      success: true,
      message: 'Daftar product berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProductDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as ProductParams;

    const result = await getProductDetail(businessId, params);

    return res.status(200).json({
      success: true,
      message: 'Detail product berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const body = res.locals.validatedBody as CreateProductBody;

    const result = await createProduct(businessId, body);

    return res.status(201).json({
      success: true,
      message: 'Product berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as ProductParams;
    const body = res.locals.validatedBody as UpdateProductBody;

    const result = await updateProduct(businessId, params, body);

    return res.status(200).json({
      success: true,
      message: 'Product berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateProductStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as ProductParams;
    const body = res.locals.validatedBody as UpdateProductStatusBody;

    const result = await updateProductStatus(businessId, params, body);

    return res.status(200).json({
      success: true,
      message: 'Status product berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
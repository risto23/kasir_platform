import type { Request, Response, NextFunction } from 'express';
import type {
  CategoryListQuery,
  CategoryParams,
  CreateCategoryBody,
  UpdateCategoryBody,
  UpdateCategoryStatusBody,
} from './categories.types';
import {
  listCategories,
  getCategoryDetail,
  createCategory,
  updateCategory,
  updateCategoryStatus,
} from './categories.service';

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

export async function listCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const query = res.locals.validatedQuery as CategoryListQuery;

    const result = await listCategories(businessId, query);

    return res.status(200).json({
      success: true,
      message: 'Daftar kategori berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getCategoryDetailHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as CategoryParams;

    const result = await getCategoryDetail(businessId, params);

    return res.status(200).json({
      success: true,
      message: 'Detail kategori berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const body = res.locals.validatedBody as CreateCategoryBody;

    const result = await createCategory(businessId, body);

    return res.status(201).json({
      success: true,
      message: 'Kategori berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as CategoryParams;
    const body = res.locals.validatedBody as UpdateCategoryBody;

    const result = await updateCategory(businessId, params, body);

    return res.status(200).json({
      success: true,
      message: 'Kategori berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateCategoryStatusHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const params = res.locals.validatedParams as CategoryParams;
    const body = res.locals.validatedBody as UpdateCategoryStatusBody;

    const result = await updateCategoryStatus(businessId, params, body);

    return res.status(200).json({
      success: true,
      message: 'Status kategori berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}
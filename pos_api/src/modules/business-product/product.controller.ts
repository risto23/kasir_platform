// pos_api/src/modules/business-product/product.controller.ts
import { NextFunction, Request, Response } from 'express';

import {
  createProduct,
  getProductDetail,
  getProductList,
  updateProduct,
  updateProductStatus,
} from './product.service';
import {
  createProductSchema,
  productListQuerySchema,
  updateProductSchema,
  updateProductStatusSchema,
} from './product.validation';

type RequestWithAccessProfile = Request & {
  accessProfile?: {
    businessId?: string;
  };
};

function getSingleParam(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (Array.isArray(value) && typeof value[0] === 'string') {
    return value[0];
  }

  return '';
}

function getBusinessIdFromRequest(req: RequestWithAccessProfile) {
  const businessId = req.accessProfile?.businessId;

  if (!businessId) {
    throw new Error('Business aktif tidak ditemukan');
  }

  return businessId;
}

export async function getProductListHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithAccessProfile;
    const businessId = getBusinessIdFromRequest(typedReq);

    const query = productListQuerySchema.parse({
      search: getSingleParam(req.query.search),
      status: getSingleParam(req.query.status) || undefined,
      categoryId: getSingleParam(req.query.categoryId) || undefined,
    });

    const items = await getProductList(businessId, query);

    return res.json({
      success: true,
      message: 'Daftar product berhasil dimuat',
      data: {
        items,
      },
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
    const typedReq = req as RequestWithAccessProfile;
    const businessId = getBusinessIdFromRequest(typedReq);
    const id = getSingleParam(req.params.id);

    const item = await getProductDetail(businessId, id);

    return res.json({
      success: true,
      message: 'Detail product berhasil dimuat',
      data: item,
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
    const typedReq = req as RequestWithAccessProfile;
    const businessId = getBusinessIdFromRequest(typedReq);
    const payload = createProductSchema.parse(req.body);

    const item = await createProduct(businessId, payload);

    return res.status(201).json({
      success: true,
      message: 'Product berhasil dibuat',
      data: item,
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
    const typedReq = req as RequestWithAccessProfile;
    const businessId = getBusinessIdFromRequest(typedReq);
    const id = getSingleParam(req.params.id);
    const payload = updateProductSchema.parse(req.body);

    const item = await updateProduct(businessId, id, payload);

    return res.json({
      success: true,
      message: 'Product berhasil diubah',
      data: item,
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
    const typedReq = req as RequestWithAccessProfile;
    const businessId = getBusinessIdFromRequest(typedReq);
    const id = getSingleParam(req.params.id);
    const payload = updateProductStatusSchema.parse(req.body);

    const item = await updateProductStatus(businessId, id, payload.status);

    return res.json({
      success: true,
      message: 'Status product berhasil diubah',
      data: item,
    });
  } catch (error) {
    return next(error);
  }
}
import type { NextFunction, Request, Response } from 'express';
import {
  createSupplierProduct,
  deleteSupplierProduct,
  listSupplierProducts,
  updateSupplierProduct,
} from './supplier-products.service';
import type {
  CreateSupplierProductBody,
  ListSupplierProductsQuery,
  SupplierProductMappingParams,
  SupplierProductParams,
  UpdateSupplierProductBody,
} from './supplier-products.types';
import {
  createSupplierProductSchema,
  supplierProductMappingParamsSchema,
  supplierProductParamsSchema,
  updateSupplierProductSchema,
} from './supplier-products.validation';

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

function parseListSupplierProductsRequest(req: Request): {
  params: SupplierProductParams;
  query: ListSupplierProductsQuery;
} {
  const parsed = supplierProductParamsSchema.parse({
    params: req.params,
    query: req.query,
    body: req.body,
  });

  return {
    params: parsed.params,
    query: parsed.query ?? {},
  };
}

function parseCreateSupplierProductRequest(req: Request): {
  params: SupplierProductParams;
  body: CreateSupplierProductBody;
} {
  const parsed = createSupplierProductSchema.parse({
    params: req.params,
    query: req.query,
    body: req.body,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseUpdateSupplierProductRequest(req: Request): {
  params: SupplierProductMappingParams;
  body: UpdateSupplierProductBody;
} {
  const parsed = updateSupplierProductSchema.parse({
    params: req.params,
    query: req.query,
    body: req.body,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseDeleteSupplierProductRequest(req: Request): {
  params: SupplierProductMappingParams;
} {
  const parsed = supplierProductMappingParamsSchema.parse({
    params: req.params,
    query: req.query,
    body: req.body,
  });

  return {
    params: parsed.params,
  };
}

export async function listSupplierProductsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, query } = parseListSupplierProductsRequest(req);

    const result = await listSupplierProducts({
      businessId,
      supplierId: params.supplierId,
      search: query.search,
      page: query.page ?? 1,
      perPage: query.perPage ?? 20,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar mapping supplier-product berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createSupplierProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseCreateSupplierProductRequest(req);

    const result = await createSupplierProduct({
      businessId,
      supplierId: params.supplierId,
      payload: body,
    });

    return res.status(201).json({
      success: true,
      message: 'Mapping supplier-product berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSupplierProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdateSupplierProductRequest(req);

    const result = await updateSupplierProduct({
      businessId,
      supplierId: params.supplierId,
      mappingId: params.mappingId,
      payload: body,
    });

    return res.status(200).json({
      success: true,
      message: 'Mapping supplier-product berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function deleteSupplierProductHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params } = parseDeleteSupplierProductRequest(req);

    const result = await deleteSupplierProduct({
      businessId,
      supplierId: params.supplierId,
      mappingId: params.mappingId,
    });

    return res.status(200).json({
      success: true,
      message: 'Mapping supplier-product berhasil dihapus.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

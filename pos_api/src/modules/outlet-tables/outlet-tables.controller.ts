import type { NextFunction, Request, Response } from 'express';

import {
  createOutletTable,
  getOutletTableById,
  listOutletTables,
  updateOutletTable,
} from './outlet-tables.service';
import {
  parseCreateOutletTableBody,
  parseOutletIdParams,
  parseOutletTableIdParams,
  parseOutletTablesListQuery,
  parseUpdateOutletTableBody,
  parseUpdateOutletTableStatusBody,
} from './outlet-tables.validation';

type BusinessRequest = Request & {
  validatedBody?: unknown;
  validatedQuery?: unknown;
  validatedParams?: unknown;
  businessContext?: {
    businessId?: string;
  };
  activeBusinessId?: string;
  currentBusinessId?: string;
};

function getBusinessId(req: BusinessRequest): string {
  const headerBusinessId = req.headers['x-business-id'];
  if (typeof headerBusinessId === 'string' && headerBusinessId.trim().length > 0) {
    return headerBusinessId;
  }

  if (req.businessContext?.businessId) {
    return req.businessContext.businessId;
  }

  if (typeof req.activeBusinessId === 'string' && req.activeBusinessId.length > 0) {
    return req.activeBusinessId;
  }

  if (typeof req.currentBusinessId === 'string' && req.currentBusinessId.length > 0) {
    return req.currentBusinessId;
  }

  const error = new Error(
    'Business context tidak ditemukan. Kirim header x-business-id.',
  ) as Error & { statusCode?: number };

  error.statusCode = 400;
  throw error;
}

export async function listOutletTablesHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const { outletId } = parseOutletIdParams(req.validatedParams ?? req.params);
    const query = parseOutletTablesListQuery(req.validatedQuery ?? req.query);

    const data = await listOutletTables(businessId, outletId, query);

    return res.status(200).json({
      success: true,
      message: 'Daftar meja outlet berhasil diambil.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getOutletTableByIdHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const { outletId, id } = parseOutletTableIdParams(
      req.validatedParams ?? req.params,
    );

    const data = await getOutletTableById(businessId, outletId, id);

    return res.status(200).json({
      success: true,
      message: 'Detail meja outlet berhasil diambil.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createOutletTableHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const { outletId } = parseOutletIdParams(req.validatedParams ?? req.params);
    const body = parseCreateOutletTableBody(req.validatedBody ?? req.body);

    const data = await createOutletTable(businessId, outletId, body);

    return res.status(201).json({
      success: true,
      message: 'Meja outlet berhasil dibuat.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateOutletTableHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const { outletId, id } = parseOutletTableIdParams(
      req.validatedParams ?? req.params,
    );
    const body = parseUpdateOutletTableBody(req.validatedBody ?? req.body);

    const data = await updateOutletTable(businessId, outletId, id, body);

    return res.status(200).json({
      success: true,
      message: 'Meja outlet berhasil diperbarui.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateOutletTableStatusHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const { outletId, id } = parseOutletTableIdParams(
      req.validatedParams ?? req.params,
    );
    const body = parseUpdateOutletTableStatusBody(
      req.validatedBody ?? req.body,
    );

    const data = await updateOutletTable(businessId, outletId, id, body);

    return res.status(200).json({
      success: true,
      message: 'Status meja outlet berhasil diperbarui.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}
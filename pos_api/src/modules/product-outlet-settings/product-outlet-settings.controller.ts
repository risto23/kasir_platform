import type { NextFunction, Request, Response } from 'express';

import {
  getProductOutletSettingsByProductId,
  listProductOutletSettings,
  updateProductOutletSetting,
} from './product-outlet-settings.service';
import {
  parseProductOutletSettingsListQuery,
  parseProductOutletSettingsParams,
  parseProductOutletSettingsProductParams,
  parseUpdateProductOutletSettingBody,
} from './product-outlet-settings.validation';

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

export async function listProductOutletSettingsHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const query = parseProductOutletSettingsListQuery(
      req.validatedQuery ?? req.query,
    );

    const data = await listProductOutletSettings(businessId, query);

    return res.status(200).json({
      success: true,
      message: 'Daftar product outlet settings berhasil diambil.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getProductOutletSettingsByProductIdHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const { productId } = parseProductOutletSettingsProductParams(
      req.validatedParams ?? req.params,
    );

    const data = await getProductOutletSettingsByProductId(businessId, productId);

    return res.status(200).json({
      success: true,
      message: 'Daftar product outlet settings per product berhasil diambil.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateProductOutletSettingHandler(
  req: BusinessRequest,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const { productId, outletId } = parseProductOutletSettingsParams(
      req.validatedParams ?? req.params,
    );
    const body = parseUpdateProductOutletSettingBody(
      req.validatedBody ?? req.body,
    );

    const data = await updateProductOutletSetting(
      businessId,
      productId,
      outletId,
      body,
    );

    return res.status(200).json({
      success: true,
      message: 'Product outlet setting berhasil diperbarui.',
      data,
    });
  } catch (error) {
    return next(error);
  }
}
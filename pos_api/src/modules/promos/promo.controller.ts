import { Request, Response } from 'express';
import {
  createPromo,
  getPromoById,
  getPromoFormMeta,
  listPromos,
  updatePromo,
  updatePromoStatus,
} from './promo.service';

function getBusinessId(req: Request): string {
  const businessId = req.businessAccess?.businessId;

  if (!businessId) {
    throw new Error('Business access context belum tersedia');
  }

  return businessId;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan';
}

export async function getPromoFormMetaController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const data = await getPromoFormMeta(businessId);

    return res.json({
      success: true,
      message: 'Form meta promo berhasil diambil',
      data,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function listPromosController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedQuery = res.locals.validatedQuery ?? {};

    const data = await listPromos({
      businessId,
      search: validatedQuery.search,
      targetType: validatedQuery.targetType,
      effectiveStatus: validatedQuery.effectiveStatus,
      status: validatedQuery.status,
    });

    return res.json({
      success: true,
      message: 'Daftar promo berhasil diambil',
      data,
    });
  } catch (error: unknown) {
    return res.status(500).json({
      success: false,
      message: getErrorMessage(error),
      errors: null,
    });
  }
}

export async function getPromoByIdController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedParams = res.locals.validatedParams ?? {};

    const data = await getPromoById(businessId, validatedParams.id);

    return res.json({
      success: true,
      message: 'Detail promo berhasil diambil',
      data,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 500;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function createPromoController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedBody = res.locals.validatedBody ?? {};

    const data = await createPromo(businessId, validatedBody);

    return res.status(201).json({
      success: true,
      message: 'Promo berhasil dibuat',
      data,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function updatePromoController(req: Request, res: Response) {
  try {
    const businessId = getBusinessId(req);
    const validatedParams = res.locals.validatedParams ?? {};
    const validatedBody = res.locals.validatedBody ?? {};

    const data = await updatePromo(
      businessId,
      validatedParams.id,
      validatedBody,
    );

    return res.json({
      success: true,
      message: 'Promo berhasil diubah',
      data,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}

export async function updatePromoStatusController(
  req: Request,
  res: Response,
) {
  try {
    const businessId = getBusinessId(req);
    const validatedParams = res.locals.validatedParams ?? {};
    const validatedBody = res.locals.validatedBody ?? {};

    const data = await updatePromoStatus(
      businessId,
      validatedParams.id,
      validatedBody.status,
    );

    return res.json({
      success: true,
      message: 'Status promo berhasil diubah',
      data,
    });
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    const statusCode = message.includes('tidak ditemukan') ? 404 : 400;

    return res.status(statusCode).json({
      success: false,
      message,
      errors: null,
    });
  }
}
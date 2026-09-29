import type { NextFunction, Request, Response } from 'express';
import {
  applySupplierCreditToInvoice,
  getSupplierCreditById,
  listSupplierCredits,
  refundSupplierCredit,
} from './supplier-credits.service';
import type {
  ApplySupplierCreditBody,
  ListSupplierCreditsQuery,
  RefundSupplierCreditBody,
  SupplierCreditParams,
  SupplierCreditQuery,
} from './supplier-credits.types';
import {
  applySupplierCreditSchema,
  getSupplierCreditByIdSchema,
  listSupplierCreditsSchema,
  refundSupplierCreditSchema,
} from './supplier-credits.validation';

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

function parseListSupplierCreditsRequest(req: Request): {
  query: ListSupplierCreditsQuery;
} {
  const parsed = listSupplierCreditsSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return { query: parsed.query };
}

function parseGetSupplierCreditByIdRequest(req: Request): {
  params: SupplierCreditParams;
  query: SupplierCreditQuery;
} {
  const parsed = getSupplierCreditByIdSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return { params: parsed.params, query: parsed.query };
}

function parseRefundSupplierCreditRequest(req: Request): {
  params: SupplierCreditParams;
  body: RefundSupplierCreditBody;
} {
  const parsed = refundSupplierCreditSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return { params: parsed.params, body: parsed.body };
}

function parseApplySupplierCreditRequest(req: Request): {
  params: SupplierCreditParams;
  body: ApplySupplierCreditBody;
} {
  const parsed = applySupplierCreditSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return { params: parsed.params, body: parsed.body };
}

export async function listSupplierCreditsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { query } = parseListSupplierCreditsRequest(req);

    const result = await listSupplierCredits({
      businessId,
      outletId: query.outletId,
      supplierId: query.supplierId,
      status: query.status,
      page: query.page ?? 1,
      perPage: query.perPage ?? 20,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar kredit supplier berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSupplierCreditByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, query } = parseGetSupplierCreditByIdRequest(req);

    const result = await getSupplierCreditById({
      businessId,
      outletId: query.outletId,
      supplierCreditId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail kredit supplier berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function refundSupplierCreditHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { params, body } = parseRefundSupplierCreditRequest(req);

    const result = await refundSupplierCredit({
      businessId,
      businessUserId,
      supplierCreditId: params.id,
      outletId: body.outletId,
      amount: body.amount,
      method: body.method,
      refundDate: body.refundDate,
      referenceNumber: body.referenceNumber,
      note: body.note,
    });

    return res.status(201).json({
      success: true,
      message: 'Refund kredit supplier berhasil dicatat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function applySupplierCreditHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { params, body } = parseApplySupplierCreditRequest(req);

    const result = await applySupplierCreditToInvoice({
      businessId,
      businessUserId,
      supplierCreditId: params.id,
      outletId: body.outletId,
      supplierInvoiceId: body.supplierInvoiceId,
      amount: body.amount,
      usageDate: body.usageDate,
      note: body.note,
    });

    return res.status(201).json({
      success: true,
      message: 'Kredit supplier berhasil dipakai untuk invoice.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

import type { NextFunction, Request, Response } from 'express';
import {
  createSupplierInvoice,
  createSupplierPayment,
  getSupplierInvoiceById,
  listSupplierInvoices,
  updateSupplierInvoice,
  voidSupplierInvoice,
} from './supplier-invoices.service';
import type {
  CreateSupplierInvoiceBody,
  CreateSupplierPaymentBody,
  ListSupplierInvoicesQuery,
  SupplierInvoiceActionBody,
  SupplierInvoiceParams,
  SupplierInvoiceQuery,
  UpdateSupplierInvoiceBody,
} from './supplier-invoices.types';
import {
  createSupplierInvoiceSchema,
  createSupplierPaymentSchema,
  getSupplierInvoiceByIdSchema,
  listSupplierInvoicesSchema,
  supplierInvoiceActionSchema,
  updateSupplierInvoiceSchema,
} from './supplier-invoices.validation';

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

function parseListSupplierInvoicesRequest(req: Request): {
  query: ListSupplierInvoicesQuery;
} {
  const parsed = listSupplierInvoicesSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    query: parsed.query,
  };
}

function parseGetSupplierInvoiceByIdRequest(req: Request): {
  params: SupplierInvoiceParams;
  query: SupplierInvoiceQuery;
} {
  const parsed = getSupplierInvoiceByIdSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    query: parsed.query,
  };
}

function parseCreateSupplierInvoiceRequest(req: Request): {
  body: CreateSupplierInvoiceBody;
} {
  const parsed = createSupplierInvoiceSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    body: parsed.body,
  };
}

function parseUpdateSupplierInvoiceRequest(req: Request): {
  params: SupplierInvoiceParams;
  body: UpdateSupplierInvoiceBody;
} {
  const parsed = updateSupplierInvoiceSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseSupplierInvoiceActionRequest(req: Request): {
  params: SupplierInvoiceParams;
  body: SupplierInvoiceActionBody;
} {
  const parsed = supplierInvoiceActionSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

function parseCreateSupplierPaymentRequest(req: Request): {
  params: SupplierInvoiceParams;
  body: CreateSupplierPaymentBody;
} {
  const parsed = createSupplierPaymentSchema.parse({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  return {
    params: parsed.params,
    body: parsed.body,
  };
}

export async function listSupplierInvoicesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { query } = parseListSupplierInvoicesRequest(req);

    const result = await listSupplierInvoices({
      businessId,
      outletId: query.outletId,
      page: query.page ?? 1,
      perPage: query.perPage ?? 10,
      search: query.search,
      status: query.status,
      supplierId: query.supplierId,
    });

    return res.status(200).json({
      success: true,
      message: 'Daftar supplier invoice berhasil diambil.',
      data: result.items,
      meta: result.meta,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getSupplierInvoiceByIdHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, query } = parseGetSupplierInvoiceByIdRequest(req);

    if (!query.outletId) {
      throw createHttpError('outletId wajib diisi', 400);
    }

    const result = await getSupplierInvoiceById({
      businessId,
      outletId: query.outletId,
      supplierInvoiceId: params.id,
    });

    return res.status(200).json({
      success: true,
      message: 'Detail supplier invoice berhasil diambil.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createSupplierInvoiceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { body } = parseCreateSupplierInvoiceRequest(req);

    const result = await createSupplierInvoice({
      businessId,
      businessUserId,
      outletId: body.outletId,
      supplierId: body.supplierId,
      goodsReceiptId: body.goodsReceiptId,
      purchaseOrderId: body.purchaseOrderId,
      invoiceNumber: body.invoiceNumber,
      invoiceDate: body.invoiceDate,
      dueDate: body.dueDate,
      notes: body.notes,
      grandTotal: body.grandTotal,
    });

    return res.status(201).json({
      success: true,
      message: 'Supplier invoice berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateSupplierInvoiceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseUpdateSupplierInvoiceRequest(req);

    const result = await updateSupplierInvoice({
      businessId,
      supplierInvoiceId: params.id,
      outletId: body.outletId,
      supplierId: body.supplierId,
      goodsReceiptId: body.goodsReceiptId,
      purchaseOrderId: body.purchaseOrderId,
      invoiceNumber: body.invoiceNumber,
      invoiceDate: body.invoiceDate,
      dueDate: body.dueDate,
      notes: body.notes,
      grandTotal: body.grandTotal,
    });

    return res.status(200).json({
      success: true,
      message: 'Supplier invoice berhasil diupdate.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function voidSupplierInvoiceHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const { params, body } = parseSupplierInvoiceActionRequest(req);

    const result = await voidSupplierInvoice({
      businessId,
      supplierInvoiceId: params.id,
      outletId: body.outletId,
    });

    return res.status(200).json({
      success: true,
      message: 'Supplier invoice berhasil dibatalkan.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

export async function createSupplierPaymentHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessIdFromRequest(req);
    const businessUserId = getBusinessUserIdFromRequest(req);
    const { params, body } = parseCreateSupplierPaymentRequest(req);

    const result = await createSupplierPayment({
      businessId,
      businessUserId,
      supplierInvoiceId: params.id,
      outletId: body.outletId,
      paymentDate: body.paymentDate,
      method: body.method,
      amount: body.amount,
      referenceNumber: body.referenceNumber,
      note: body.note,
    });

    return res.status(201).json({
      success: true,
      message: 'Pembayaran supplier berhasil dibuat.',
      data: result,
    });
  } catch (error) {
    return next(error);
  }
}

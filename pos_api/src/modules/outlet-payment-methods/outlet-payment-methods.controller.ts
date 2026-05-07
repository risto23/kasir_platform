import type { NextFunction, Request, Response } from 'express';
import {
  createOutletPaymentMethod,
  deleteOutletPaymentMethod,
  listOutletPaymentMethods,
  updateOutletPaymentMethod,
} from './outlet-payment-methods.service';
import {
  createOutletPaymentMethodSchema,
  deleteOutletPaymentMethodSchema,
  listOutletPaymentMethodsSchema,
  updateOutletPaymentMethodSchema,
} from './outlet-payment-methods.validation';

function getBusinessId(req: Request): string {
  const id =
    req.businessAccess?.businessId ||
    (typeof req.headers['x-business-id'] === 'string' ? req.headers['x-business-id'] : undefined);
  if (!id) throw Object.assign(new Error('Business context tidak ditemukan.'), { statusCode: 400 });
  return id;
}

export async function listOutletPaymentMethodsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const parsed = listOutletPaymentMethodsSchema.parse({
      params: req.params,
      query: req.query,
      body: req.body,
    });
    const items = await listOutletPaymentMethods({
      businessId,
      outletId: parsed.params.outletId,
      activeOnly: parsed.query.activeOnly,
    });
    return res.json({ success: true, data: items });
  } catch (err) {
    return next(err);
  }
}

export async function createOutletPaymentMethodHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const parsed = createOutletPaymentMethodSchema.parse({
      params: req.params,
      body: req.body,
      query: req.query,
    });
    const item = await createOutletPaymentMethod({
      businessId,
      outletId: parsed.params.outletId,
      name: parsed.body.name,
      code: parsed.body.code,
      isActive: parsed.body.isActive,
      surchargeRules: parsed.body.surchargeRules,
      sortOrder: parsed.body.sortOrder,
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    return next(err);
  }
}

export async function updateOutletPaymentMethodHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const parsed = updateOutletPaymentMethodSchema.parse({
      params: req.params,
      body: req.body,
      query: req.query,
    });
    const item = await updateOutletPaymentMethod({
      id: parsed.params.id,
      businessId,
      outletId: parsed.params.outletId,
      name: parsed.body.name,
      isActive: parsed.body.isActive,
      surchargeRules: parsed.body.surchargeRules,
      sortOrder: parsed.body.sortOrder,
    });
    return res.json({ success: true, data: item });
  } catch (err) {
    return next(err);
  }
}

export async function deleteOutletPaymentMethodHandler(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const businessId = getBusinessId(req);
    const parsed = deleteOutletPaymentMethodSchema.parse({
      params: req.params,
      body: req.body,
      query: req.query,
    });
    await deleteOutletPaymentMethod({
      id: parsed.params.id,
      businessId,
      outletId: parsed.params.outletId,
    });
    return res.json({ success: true, message: 'Metode pembayaran dihapus.' });
  } catch (err) {
    return next(err);
  }
}

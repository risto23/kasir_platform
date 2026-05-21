import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import {
  createStockOpname,
  listStockOpnames,
  getStockOpnameDetail,
  updateOpnameItems,
  finalizeStockOpname,
  cancelStockOpname,
} from './stock-opname.service';
import { prisma } from '../../config/prisma';
import type { CountItemInput } from './stock-opname.types';

export async function createOpnameHandler(req: Request, res: Response) {
  const businessId = req.businessAccess?.businessId;
  const businessUserId = req.businessAccess?.businessUserId ?? null;
  if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

  const { outletId, note } = req.body as { outletId: string; note?: string };
  const result = await createStockOpname(businessId, outletId, businessUserId, note);
  return res.status(201).json(successResponse('Sesi stock opname dibuat', result));
}

export async function listOpnameHandler(req: Request, res: Response) {
  const businessId = req.businessAccess?.businessId;
  if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

  const outletId = req.query.outletId as string | undefined;
  const status = req.query.status as 'DRAFT' | 'FINALIZED' | 'CANCELLED' | undefined;

  const items = await listStockOpnames({ businessId, outletId, status });
  return res.json(successResponse('OK', { items }));
}

export async function getOpnameDetailHandler(req: Request, res: Response) {
  const businessId = req.businessAccess?.businessId;
  if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

  const id = req.params['id'] as string;
  const data = await getStockOpnameDetail(businessId, id);
  return res.json(successResponse('OK', data));
}

export async function updateOpnameItemsHandler(req: Request, res: Response) {
  const businessId = req.businessAccess?.businessId;
  if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

  const id = req.params['id'] as string;
  const { items } = req.body as { items: CountItemInput[] };

  await updateOpnameItems(businessId, id, items);
  return res.json(successResponse('Item diperbarui'));
}

export async function finalizeOpnameHandler(req: Request, res: Response) {
  const businessId = req.businessAccess?.businessId;
  const businessUserId = req.businessAccess?.businessUserId ?? null;
  if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

  const id = req.params['id'] as string;
  const { note } = req.body as { note?: string };

  const opname = await prisma.stockOpname.findFirst({
    where: { id, businessId },
    select: { outletId: true },
  });
  if (!opname) return res.status(404).json(errorResponse('Stock opname tidak ditemukan'));

  await finalizeStockOpname(businessId, opname.outletId, id, businessUserId, note);
  return res.json(successResponse('Stock opname berhasil di-finalize'));
}

export async function cancelOpnameHandler(req: Request, res: Response) {
  const businessId = req.businessAccess?.businessId;
  if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

  const id = req.params['id'] as string;
  await cancelStockOpname(businessId, id);
  return res.json(successResponse('Stock opname dibatalkan'));
}

import { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import { getMovements, getStockSummary, stockChange } from './inventory.service';
import type { InventoryMovementType } from '@prisma/client';

export async function getStockSummaryHandler(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;
    if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

    const { outletId, search, categoryId, productStatus, available } = req.query as Record<string, string>;
    const data = await getStockSummary({
      businessId,
      outletId,
      search,
      categoryId,
      productStatus: productStatus as 'ACTIVE' | 'INACTIVE' | undefined,
      available,
    });

    return res.json(successResponse('OK', { items: data }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat stock summary';
    return res.status(400).json(errorResponse(message));
  }
}

export async function getMovementsHandler(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;
    if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

    const { outletId, productId, type, search } = req.query as Record<string, string>;

    const data = await getMovements({
      businessId,
      outletId,
      productId,
      type: type as InventoryMovementType | undefined,
      search,
    });

    return res.json(successResponse('OK', { items: data }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal memuat movements';
    return res.status(400).json(errorResponse(message));
  }
}

export async function stockInHandler(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;
    const businessUserId = req.businessAccess?.businessUserId || null;
    if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

    const { outletId, productId, quantity, note, referenceType, referenceId } = req.body as {
      outletId: string; productId: string; quantity: number; note?: string; referenceType?: string; referenceId?: string;
    };

    const result = await stockChange(businessUserId, businessId, outletId, productId, 'IN', quantity, note, referenceType, referenceId);
    return res.json(successResponse('Stock in berhasil', { movementId: result.movement.id }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal stock in';
    return res.status(400).json(errorResponse(message));
  }
}

export async function stockOutHandler(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;
    const businessUserId = req.businessAccess?.businessUserId || null;
    if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

    const { outletId, productId, quantity, note, referenceType, referenceId } = req.body as {
      outletId: string; productId: string; quantity: number; note?: string; referenceType?: string; referenceId?: string;
    };

    const result = await stockChange(businessUserId, businessId, outletId, productId, 'OUT', quantity, note, referenceType, referenceId);
    return res.json(successResponse('Stock out berhasil', { movementId: result.movement.id }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal stock out';
    return res.status(400).json(errorResponse(message));
  }
}

export async function adjustmentHandler(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;
    const businessUserId = req.businessAccess?.businessUserId || null;
    if (!businessId) return res.status(403).json(errorResponse('Business context tidak tersedia'));

    const { outletId, productId, type, quantity, note, referenceType, referenceId } = req.body as {
      outletId: string; productId: string; type: InventoryMovementType; quantity: number; note?: string; referenceType?: string; referenceId?: string;
    };

    if (type !== 'ADJUSTMENT_IN' && type !== 'ADJUSTMENT_OUT') {
      return res.status(400).json(errorResponse('Tipe adjustment tidak valid'));
    }

    const result = await stockChange(businessUserId, businessId, outletId, productId, type, quantity, note, referenceType, referenceId);
    return res.json(successResponse('Stock adjustment berhasil', { movementId: result.movement.id }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gagal adjustment';
    return res.status(400).json(errorResponse(message));
  }
}

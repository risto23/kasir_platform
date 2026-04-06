import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import {
  getOutletTableMonitor,
  getRestaurantOperationsErrorMessage,
  getRestaurantOperationsErrorStatus,
  getTableQr,
} from './restaurant-operations.service';

function getOutletIdFromParams(req: Request): string {
  const rawOutletId = req.params.outletId;

  if (typeof rawOutletId !== 'string' || rawOutletId.trim() === '') {
    throw new Error('outletId wajib diisi');
  }

  return rawOutletId.trim();
}

function getTableIdFromParams(req: Request): string {
  const rawTableId = req.params.tableId;

  if (typeof rawTableId !== 'string' || rawTableId.trim() === '') {
    throw new Error('tableId wajib diisi');
  }

  return rawTableId.trim();
}

export async function getTableQrController(req: Request, res: Response) {
  try {
    const outletId = getOutletIdFromParams(req);
    const tableId = getTableIdFromParams(req);

    const data = await getTableQr(outletId, tableId);

    return res
      .status(200)
      .json(successResponse('QR meja berhasil dibuat.', data));
  } catch (error: unknown) {
    return res
      .status(getRestaurantOperationsErrorStatus(error))
      .json(errorResponse(getRestaurantOperationsErrorMessage(error)));
  }
}

export async function getOutletTableMonitorController(req: Request, res: Response) {
  try {
    const outletId = getOutletIdFromParams(req);

    const data = await getOutletTableMonitor(outletId);

    return res
      .status(200)
      .json(successResponse('Monitor meja berhasil diambil.', data));
  } catch (error: unknown) {
    return res
      .status(getRestaurantOperationsErrorStatus(error))
      .json(errorResponse(getRestaurantOperationsErrorMessage(error)));
  }
}
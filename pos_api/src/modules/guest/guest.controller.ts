import type { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import {
  createGuestOrder,
  getGuestMenu,
  getGuestModuleErrorMessage,
  getGuestModuleErrorStatus,
} from './guest.service';
import type { CreateGuestOrderInput } from './guest.types';

function getOutletIdFromParams(req: Request): string {
  const outletIdValue = req.params.outletId;

  if (typeof outletIdValue !== 'string' || outletIdValue.trim() === '') {
    throw new Error('outletId wajib diisi');
  }

  return outletIdValue.trim();
}

function getGuestMenuQuery(req: Request): { tableId: string; token: string } {
  const tableIdValue = req.query.tableId;
  const tokenValue = req.query.token;

  if (typeof tableIdValue !== 'string' || tableIdValue.trim() === '') {
    throw new Error('tableId wajib diisi');
  }

  if (typeof tokenValue !== 'string' || tokenValue.trim() === '') {
    throw new Error('token wajib diisi');
  }

  return {
    tableId: tableIdValue.trim(),
    token: tokenValue.trim(),
  };
}

function getCreateGuestOrderInput(req: Request): CreateGuestOrderInput {
  const body = req.body as {
    tableId?: unknown;
    token?: unknown;
    guestName?: unknown;
    notes?: unknown;
    items?: unknown;
  };

  if (typeof body.tableId !== 'string' || body.tableId.trim() === '') {
    throw new Error('tableId wajib diisi');
  }

  if (typeof body.token !== 'string' || body.token.trim() === '') {
    throw new Error('token wajib diisi');
  }

  if (!Array.isArray(body.items)) {
    throw new Error('items wajib berupa array');
  }

  const items = body.items.map((item) => {
    if (
      typeof item !== 'object' ||
      item === null ||
      !('productId' in item) ||
      !('quantity' in item)
    ) {
      throw new Error('Format item guest order tidak valid');
    }

    const productId = (item as { productId: unknown }).productId;
    const quantity = (item as { quantity: unknown }).quantity;
    const note = (item as { note?: unknown }).note;

    if (typeof productId !== 'string' || productId.trim() === '') {
      throw new Error('productId wajib diisi');
    }

    if (typeof quantity !== 'number' || quantity <= 0) {
      throw new Error('quantity harus lebih dari 0');
    }

    return {
      productId: productId.trim(),
      quantity,
      note: typeof note === 'string' ? note : null,
    };
  });

  return {
    tableId: body.tableId.trim(),
    token: body.token.trim(),
    guestName: typeof body.guestName === 'string' ? body.guestName : null,
    notes: typeof body.notes === 'string' ? body.notes : null,
    items,
  };
}

export async function getGuestMenuController(req: Request, res: Response) {
  try {
    const outletId = getOutletIdFromParams(req);
    const query = getGuestMenuQuery(req);

    const data = await getGuestMenu(outletId, query.tableId, query.token);

    return res
      .status(200)
      .json(successResponse('Guest menu berhasil diambil.', data));
  } catch (error: unknown) {
    return res
      .status(getGuestModuleErrorStatus(error))
      .json(errorResponse(getGuestModuleErrorMessage(error)));
  }
}

export async function createGuestOrderController(req: Request, res: Response) {
  try {
    const outletId = getOutletIdFromParams(req);
    const input = getCreateGuestOrderInput(req);

    const data = await createGuestOrder(outletId, input);

    return res
      .status(201)
      .json(successResponse('Guest order berhasil dibuat.', data));
  } catch (error: unknown) {
    return res
      .status(getGuestModuleErrorStatus(error))
      .json(errorResponse(getGuestModuleErrorMessage(error)));
  }
}

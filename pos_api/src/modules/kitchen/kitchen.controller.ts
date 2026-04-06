// pos_api/src/modules/kitchen/kitchen.controller.ts
import { Request, Response } from 'express';
import { errorResponse } from '../../utils/api-response';
import {
  listKitchenOrdersSchema,
  updateKitchenOrderItemStatusSchema,
} from './kitchen.validation';
import {
  getKitchenServiceErrorMessage,
  getKitchenServiceErrorStatus,
  listKitchenOrders,
  updateKitchenOrderItemStatus,
} from './kitchen.service';

export async function getKitchenOrdersController(
  req: Request,
  res: Response,
) {
  try {
    const parsed = listKitchenOrdersSchema.parse({
      params: req.params,
      query: req.query,
      body: req.body,
    });

    const result = await listKitchenOrders({
      businessAccess: req.businessAccess,
      outletId: parsed.params.outletId,
      page: parsed.query.page,
      perPage: parsed.query.perPage,
      queue: parsed.query.queue,
    });

    return res.json({
      success: true,
      message: 'Daftar order kitchen berhasil diambil.',
      data: result,
    });
  } catch (error: unknown) {
    return res
      .status(getKitchenServiceErrorStatus(error))
      .json(errorResponse(getKitchenServiceErrorMessage(error)));
  }
}

export async function updateKitchenOrderItemStatusController(
  req: Request,
  res: Response,
) {
  try {
    const parsed = updateKitchenOrderItemStatusSchema.parse({
      params: req.params,
      body: req.body,
      query: req.query,
    });

    const result = await updateKitchenOrderItemStatus({
      businessAccess: req.businessAccess,
      orderId: parsed.params.id,
      itemId: parsed.params.itemId,
      status: parsed.body.status,
    });

    return res.json({
      success: true,
      message: 'Status item kitchen berhasil diperbarui.',
      data: result,
    });
  } catch (error: unknown) {
    return res
      .status(getKitchenServiceErrorStatus(error))
      .json(errorResponse(getKitchenServiceErrorMessage(error)));
  }
}
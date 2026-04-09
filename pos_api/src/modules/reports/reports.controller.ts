import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import { salesSummaryQuerySchema, ordersReportQuerySchema, itemsReportQuerySchema } from './reports.validation';
import { getItemsReportService, getOrdersReportService, getSalesSummaryService } from './reports.service';

function getBusinessId(req: Request) {
  const businessId = req.businessAccess?.businessId;
  if (!businessId) throw new Error('Business context tidak tersedia');
  return businessId;
}

export async function getSalesSummaryController(req: Request, res: Response) {
  try {
    const parsed = salesSummaryQuerySchema.parse(req.query);
    const businessId = getBusinessId(req);

    const result = await getSalesSummaryService({
      businessId,
      scope: parsed.scope ?? 'outlet',
      outletId: parsed.outletId,
      groupBy: parsed.groupBy ?? 'day',
      start: parsed.start,
      end: parsed.end,
    });

    return res.json(successResponse('Sales summary generated', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat sales summary';
    return res.status(400).json(errorResponse(message));
  }
}

export async function getOrdersReportController(req: Request, res: Response) {
  try {
    const parsed = ordersReportQuerySchema.parse(req.query);
    const businessId = getBusinessId(req);

    const result = await getOrdersReportService({
      businessId,
      scope: parsed.scope ?? 'outlet',
      outletId: parsed.outletId,
      start: parsed.start,
      end: parsed.end,
      page: parsed.page ?? 1,
      perPage: parsed.perPage ?? 20,
    });

    return res.json(successResponse('Orders report generated', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat orders report';
    return res.status(400).json(errorResponse(message));
  }
}

export async function getItemsReportController(req: Request, res: Response) {
  try {
    const parsed = itemsReportQuerySchema.parse(req.query);
    const businessId = getBusinessId(req);

    const result = await getItemsReportService({
      businessId,
      scope: parsed.scope ?? 'outlet',
      outletId: parsed.outletId,
      start: parsed.start,
      end: parsed.end,
      page: parsed.page ?? 1,
      perPage: parsed.perPage ?? 50,
    });

    return res.json(successResponse('Items report generated', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat items report';
    return res.status(400).json(errorResponse(message));
  }
}


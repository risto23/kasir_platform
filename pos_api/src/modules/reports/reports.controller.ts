import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import {
  salesSummaryQuerySchema,
  ordersReportQuerySchema,
  itemsReportQuerySchema,
  supplierPayablesReportQuerySchema,
} from './reports.validation';
import {
  getItemsReportService,
  getOrdersReportService,
  getSalesSummaryService,
  getSupplierPayablesReportService,
  buildSalesSummaryCsv,
  buildOrdersReportCsv,
  buildItemsReportCsv,
  buildSupplierPayablesCsv,
} from './reports.service';

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

export async function getSupplierPayablesReportController(req: Request, res: Response) {
  try {
    const parsed = supplierPayablesReportQuerySchema.parse(req.query);
    const businessId = getBusinessId(req);

    const result = await getSupplierPayablesReportService({
      businessId,
      scope: parsed.scope ?? 'outlet',
      outletId: parsed.outletId,
      supplierId: parsed.supplierId,
      asOfDate: parsed.asOfDate,
      page: parsed.page ?? 1,
      perPage: parsed.perPage ?? 50,
    });

    return res.json(successResponse('Supplier payables report generated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Gagal memuat laporan payable supplier';
    return res.status(400).json(errorResponse(message));
  }
}

// ── CSV export controllers ────────────────────────────────────────────────────

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(csv);
}

export async function exportSalesSummaryController(req: Request, res: Response) {
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
    return sendCsv(res, 'sales-summary.csv', buildSalesSummaryCsv(result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal export sales summary';
    return res.status(400).json(errorResponse(message));
  }
}

export async function exportOrdersReportController(req: Request, res: Response) {
  try {
    const parsed = ordersReportQuerySchema.parse(req.query);
    const businessId = getBusinessId(req);
    const result = await getOrdersReportService({
      businessId,
      scope: parsed.scope ?? 'outlet',
      outletId: parsed.outletId,
      start: parsed.start,
      end: parsed.end,
      page: 1,
      perPage: 10_000,
    });
    return sendCsv(res, 'orders.csv', buildOrdersReportCsv(result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal export orders report';
    return res.status(400).json(errorResponse(message));
  }
}

export async function exportItemsReportController(req: Request, res: Response) {
  try {
    const parsed = itemsReportQuerySchema.parse(req.query);
    const businessId = getBusinessId(req);
    const result = await getItemsReportService({
      businessId,
      scope: parsed.scope ?? 'outlet',
      outletId: parsed.outletId,
      start: parsed.start,
      end: parsed.end,
      page: 1,
      perPage: 10_000,
    });
    return sendCsv(res, 'items.csv', buildItemsReportCsv(result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal export items report';
    return res.status(400).json(errorResponse(message));
  }
}

export async function exportSupplierPayablesReportController(req: Request, res: Response) {
  try {
    const parsed = supplierPayablesReportQuerySchema.parse(req.query);
    const businessId = getBusinessId(req);
    const result = await getSupplierPayablesReportService({
      businessId,
      scope: parsed.scope ?? 'outlet',
      outletId: parsed.outletId,
      supplierId: parsed.supplierId,
      asOfDate: parsed.asOfDate,
      page: 1,
      perPage: 10_000,
    });
    return sendCsv(res, 'supplier-payables.csv', buildSupplierPayablesCsv(result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal export laporan payable supplier';
    return res.status(400).json(errorResponse(message));
  }
}


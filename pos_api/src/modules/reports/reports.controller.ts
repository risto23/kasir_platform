import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import { getBusinessSalesReport, getOutletSalesReport } from './reports.service';
import ExcelJS from 'exceljs';

function toCsvLine(fields: (string | number)[]): string {
  return fields
    .map((v) => {
      const s = String(v ?? '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    })
    .join(',');
}

function sendCsv(res: Response, filename: string, header: string[], rows: (string | number)[][]) {
  const lines = [toCsvLine(header), ...rows.map((r) => toCsvLine(r))];
  const csv = '\uFEFF' + lines.join('\r\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(csv);
}

async function sendXlsxOutlet(res: Response, filename: string, payload: any) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'POS Platform';
  wb.created = new Date();

  const s1 = wb.addWorksheet('Summary');
  const summary = payload.summary || {};
  s1.addRow(['Metric', 'Value']).font = { bold: true } as any;
  const rows1: [string, any][] = [
    ['Orders', summary.orders ?? 0],
    ['Gross Sales', summary.gross ?? '0.00'],
    ['Discount', summary.discount ?? '0.00'],
    ['Tax', summary.tax ?? '0.00'],
    ['Service', summary.service ?? '0.00'],
    ['Net Sales', summary.net ?? '0.00'],
    ['Items Sold', summary.items ?? 0],
    ['AOV', summary.aov ?? '0.00'],
  ];
  if (summary.refunds) {
    rows1.push(['Refund Count', summary.refunds.count ?? 0]);
    rows1.push(['Refund Amount', summary.refunds.amount ?? '0.00']);
  }
  rows1.forEach((r) => s1.addRow(r));
  s1.columns = [{ width: 22 }, { width: 18 }];

  const s2 = wb.addWorksheet('Timeseries');
  s2.addRow(['Date', 'Orders', 'Gross', 'Discount', 'Tax', 'Service', 'Net', 'Items', 'AOV']).font = { bold: true } as any;
  (payload.timeseries || []).forEach((p: any) => {
    const aov = p.orders > 0 ? (Number(p.net) / p.orders).toFixed(2) : '0.00';
    s2.addRow([p.date, p.orders, p.gross, p.discount, p.tax, p.service, p.net, p.items, aov]);
  });
  s2.columns = [
    { width: 12 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 10 },
  ];

  const buf = (await wb.xlsx.writeBuffer()) as Buffer;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(Buffer.from(buf));
}

async function sendXlsxBusiness(res: Response, filename: string, groupBy: 'day' | 'outlet', payload: any) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'POS Platform';
  wb.created = new Date();

  const s1 = wb.addWorksheet('Summary');
  const summary = payload.summary || {};
  s1.addRow(['Metric', 'Value']).font = { bold: true } as any;
  const rows1: [string, any][] = [
    ['Orders', summary.orders ?? 0],
    ['Gross Sales', summary.gross ?? '0.00'],
    ['Discount', summary.discount ?? '0.00'],
    ['Tax', summary.tax ?? '0.00'],
    ['Service', summary.service ?? '0.00'],
    ['Net Sales', summary.net ?? '0.00'],
    ['Items Sold', summary.items ?? 0],
    ['AOV', summary.aov ?? '0.00'],
  ];
  if (summary.refunds) {
    rows1.push(['Refund Count', summary.refunds.count ?? 0]);
    rows1.push(['Refund Amount', summary.refunds.amount ?? '0.00']);
  }
  rows1.forEach((r) => s1.addRow(r));
  s1.columns = [{ width: 22 }, { width: 18 }];

  if (groupBy === 'outlet' && Array.isArray(payload.outlets)) {
    const s = wb.addWorksheet('By Outlet');
    s.addRow(['Outlet', 'Orders', 'Gross', 'Discount', 'Tax', 'Service', 'Net', 'Items', 'AOV']).font = { bold: true } as any;
    (payload.outlets || []).forEach((r: any) => {
      s.addRow([r.outletName, r.orders, r.gross, r.discount, r.tax, r.service, r.net, r.items, r.aov]);
    });
    s.columns = [
      { width: 28 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 10 },
    ];
  } else if (Array.isArray(payload.timeseries)) {
    const s = wb.addWorksheet('Timeseries');
    s.addRow(['Date', 'Orders', 'Gross', 'Discount', 'Tax', 'Service', 'Net', 'Items', 'AOV']).font = { bold: true } as any;
    (payload.timeseries || []).forEach((p: any) => {
      const aov = p.orders > 0 ? (Number(p.net) / p.orders).toFixed(2) : '0.00';
      s.addRow([p.date, p.orders, p.gross, p.discount, p.tax, p.service, p.net, p.items, aov]);
    });
    s.columns = [
      { width: 12 }, { width: 10 }, { width: 14 }, { width: 14 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 10 },
    ];
  }

  const buf = (await wb.xlsx.writeBuffer()) as Buffer;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.status(200).send(Buffer.from(buf));
}

export async function getOutletSalesHandler(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;
    if (!businessId) return res.status(400).json(errorResponse('Business context tidak tersedia'));

    const outletId = String(req.query.outletId || '');
    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;
    const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : undefined;

    const data = await getOutletSalesReport({ businessId, outletId, dateFrom, dateTo, timezone });
    const format = String(req.query.format || '').toLowerCase();
    if (format === 'csv') {
      const filename = `outlet-sales-${outletId}-${dateFrom ?? ''}-${dateTo ?? ''}.csv`;
      const header = ['Date','Orders','Gross','Discount','Tax','Service','Net','Items','AOV'];
      const rows = (data.timeseries || []).map((p) => {
        const aov = p.orders > 0 ? (Number(p.net) / p.orders).toFixed(2) : '0.00';
        return [p.date, p.orders, p.gross, p.discount, p.tax, p.service, p.net, p.items, aov];
      });
      return sendCsv(res, filename, header, rows);
    }
    if (format === 'xlsx' || format === 'excel') {
      const filename = `outlet-sales-${outletId}-${dateFrom ?? ''}-${dateTo ?? ''}.xlsx`;
      return sendXlsxOutlet(res, filename, data);
    }
    return res.json(successResponse('OK', data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat laporan outlet';
    return res.status(500).json(errorResponse(message));
  }
}

export async function getBusinessSalesHandler(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;
    if (!businessId) return res.status(400).json(errorResponse('Business context tidak tersedia'));

    const groupBy = (typeof req.query.groupBy === 'string' ? req.query.groupBy : 'day') as 'day' | 'outlet';
    const timezone = typeof req.query.timezone === 'string' ? req.query.timezone : undefined;

    const outletIdsRaw = req.query.outletIds;
    const outletIds = Array.isArray(outletIdsRaw)
      ? outletIdsRaw.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
      : typeof outletIdsRaw === 'string' && outletIdsRaw.trim().length > 0
        ? [outletIdsRaw]
        : undefined;

    const access = req.businessAccess!;
    const scopedOutletIds = access.hasAllOutletAccess
      ? outletIds
      : (outletIds || access.allowedOutletIds);

    const dateFrom = typeof req.query.dateFrom === 'string' ? req.query.dateFrom : undefined;
    const dateTo = typeof req.query.dateTo === 'string' ? req.query.dateTo : undefined;

    const data = await getBusinessSalesReport({
      businessId,
      outletIds: scopedOutletIds && scopedOutletIds.length > 0 ? scopedOutletIds : undefined,
      dateFrom,
      dateTo,
      groupBy,
      timezone,
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'csv') {
      const filename = groupBy === 'outlet'
        ? `business-sales-by-outlet-${dateFrom ?? ''}-${dateTo ?? ''}.csv`
        : `business-sales-timeseries-${dateFrom ?? ''}-${dateTo ?? ''}.csv`;
      if (groupBy === 'outlet' && 'outlets' in data) {
        const header = ['Outlet','Orders','Gross','Discount','Tax','Service','Net','Items','AOV'];
        const rows = (data as any).outlets.map((r: any) => [r.outletName, r.orders, r.gross, r.discount, r.tax, r.service, r.net, r.items, r.aov]);
        return sendCsv(res, filename, header, rows);
      } else {
        const header = ['Date','Orders','Gross','Discount','Tax','Service','Net','Items','AOV'];
        const rows = (data as any).timeseries.map((p: any) => {
          const aov = p.orders > 0 ? (Number(p.net) / p.orders).toFixed(2) : '0.00';
          return [p.date, p.orders, p.gross, p.discount, p.tax, p.service, p.net, p.items, aov];
        });
        return sendCsv(res, filename, header, rows);
      }
    }
    if (format === 'xlsx' || format === 'excel') {
      const filename = groupBy === 'outlet'
        ? `business-sales-by-outlet-${dateFrom ?? ''}-${dateTo ?? ''}.xlsx`
        : `business-sales-timeseries-${dateFrom ?? ''}-${dateTo ?? ''}.xlsx`;
      return sendXlsxBusiness(res, filename, groupBy, data);
    }

    return res.json(successResponse('OK', data));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat laporan bisnis';
    return res.status(500).json(errorResponse(message));
  }
}

export async function getSalesHealthHandler(req: Request, res: Response) {
  try {
    const access = req.businessAccess;
    if (!access) return res.status(400).json(errorResponse('Business context tidak tersedia'));

    const outletCount = access.hasAllOutletAccess ? 'ALL' : access.allowedOutletIds.length;
    return res.json(successResponse('OK', {
      businessId: access.businessId,
      outletScope: outletCount,
      timezoneDefault: 'Asia/Jakarta',
    }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat health laporan';
    return res.status(500).json(errorResponse(message));
  }
}
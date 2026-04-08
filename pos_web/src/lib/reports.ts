'use client';

import { api } from '@/lib/api';
import type { ApiEnvelope } from '@/types/business-user';
import type {
  BusinessGroupBy,
  BusinessSalesByOutlet,
  BusinessSalesReport,
  BusinessSalesTimeseries,
  OutletSalesReport,
} from '@/types/report';

export async function fetchOutletSales(params: {
  outletId: string;
  dateFrom?: string;
  dateTo?: string;
  timezone?: string;
}): Promise<OutletSalesReport> {
  const response = await api.get<ApiEnvelope<OutletSalesReport>>('/reports/sales/outlet', {
    params,
  });

  return (response.data?.data || response.data) as OutletSalesReport;
}

export async function fetchBusinessSales(params: {
  outletIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  groupBy?: BusinessGroupBy;
  timezone?: string;
}): Promise<BusinessSalesReport> {
  const response = await api.get<ApiEnvelope<BusinessSalesReport>>('/reports/sales/business', {
    params,
  });

  const data = (response.data?.data || response.data) as BusinessSalesReport;
  return data;
}
export async function exportOutletSalesCsv(params: {
  outletId: string;
  dateFrom?: string;
  dateTo?: string;
  timezone?: string;
}): Promise<Blob> {
  const response = await api.get('/reports/sales/outlet', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function exportBusinessSalesCsv(params: {
  outletIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  groupBy?: BusinessGroupBy;
  timezone?: string;
}): Promise<Blob> {
  const response = await api.get('/reports/sales/business', {
    params: { ...params, format: 'csv' },
    responseType: 'blob',
  });
  return response.data as Blob;
}
export async function exportOutletSalesXlsx(params: {
  outletId: string;
  dateFrom?: string;
  dateTo?: string;
  timezone?: string;
}): Promise<Blob> {
  const response = await api.get('/reports/sales/outlet', {
    params: { ...params, format: 'xlsx' },
    responseType: 'blob',
  });
  return response.data as Blob;
}

export async function exportBusinessSalesXlsx(params: {
  outletIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  groupBy?: BusinessGroupBy;
  timezone?: string;
}): Promise<Blob> {
  const response = await api.get('/reports/sales/business', {
    params: { ...params, format: 'xlsx' },
    responseType: 'blob',
  });
  return response.data as Blob;
}
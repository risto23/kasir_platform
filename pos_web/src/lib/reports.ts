import { api } from '@/lib/api';

export async function fetchSalesSummary(params: { scope?: 'business'|'outlet'; outletId?: string; groupBy?: 'day'|'week'|'month'; start: string; end: string }) {
  const response = await api.get('/reports/sales-summary', { params });
  return response.data?.data;
}

export async function fetchOrdersReport(params: { scope?: 'business'|'outlet'; outletId?: string; page?: number; perPage?: number; start: string; end: string }) {
  const response = await api.get('/reports/orders', { params });
  return response.data?.data;
}

export async function fetchItemsReport(params: { scope?: 'business'|'outlet'; outletId?: string; page?: number; perPage?: number; start: string; end: string }) {
  const response = await api.get('/reports/items', { params });
  return response.data?.data;
}

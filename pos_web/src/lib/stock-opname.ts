import { api } from './api';
import type { StockOpnameListItem, StockOpnameDetail } from '../types/stock-opname';

type ApiResponse<T> = { success: boolean; message: string; data: T };

export async function fetchOpnameList(params?: {
  outletId?: string;
  status?: string;
}): Promise<ApiResponse<{ items: StockOpnameListItem[] }>> {
  const { data } = await api.get<ApiResponse<{ items: StockOpnameListItem[] }>>('/stock-opname', { params });
  return data;
}

export async function fetchOpnameDetail(id: string): Promise<ApiResponse<StockOpnameDetail>> {
  const { data } = await api.get<ApiResponse<StockOpnameDetail>>(`/stock-opname/${id}`);
  return data;
}

export async function postCreateOpname(body: {
  outletId: string;
  note?: string;
}): Promise<ApiResponse<{ id: string }>> {
  const { data } = await api.post<ApiResponse<{ id: string }>>('/stock-opname', body);
  return data;
}

export async function putOpnameItems(
  id: string,
  items: { productId: string; countedStock: number; note?: string }[],
): Promise<ApiResponse<null>> {
  const { data } = await api.put<ApiResponse<null>>(`/stock-opname/${id}/items`, { items });
  return data;
}

export async function postFinalizeOpname(id: string, note?: string): Promise<ApiResponse<null>> {
  const { data } = await api.post<ApiResponse<null>>(`/stock-opname/${id}/finalize`, { note });
  return data;
}

export async function postCancelOpname(id: string): Promise<ApiResponse<null>> {
  const { data } = await api.post<ApiResponse<null>>(`/stock-opname/${id}/cancel`, {});
  return data;
}

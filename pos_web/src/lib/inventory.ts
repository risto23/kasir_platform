import { api } from './api';
import type { ApiResponse, InventoryMovementType, MovementListItem, StockSummaryItem } from '../types/inventory';

export type StockSummaryMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export async function fetchStockSummary(params: {
  outletId: string;
  search?: string;
  categoryId?: string;
  productStatus?: 'ACTIVE' | 'INACTIVE';
  available?: boolean;
  page?: number;
  perPage?: number;
}): Promise<ApiResponse<{ items: StockSummaryItem[]; meta?: StockSummaryMeta }>> {
  const { available, ...rest } = params;
  const { data } = await api.get<ApiResponse<{ items: StockSummaryItem[]; meta?: StockSummaryMeta }>>(
    '/inventory/stock-summary',
    {
      params: {
        ...rest,
        available: available !== undefined ? String(available) : undefined,
      },
    },
  );
  return data;
}

export async function fetchMovements(params: {
  outletId: string;
  productId?: string;
  type?: InventoryMovementType;
  search?: string;
}): Promise<ApiResponse<{ items: MovementListItem[] }>> {
  const { data } = await api.get<ApiResponse<{ items: MovementListItem[] }>>('/inventory/movements', { params });
  return data;
}

export async function postStockIn(body: {
  outletId: string;
  productId: string;
  quantity: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<ApiResponse<{ movementId: string }>> {
  const { data } = await api.post<ApiResponse<{ movementId: string }>>('/inventory/movements/stock-in', body);
  return data;
}

export async function postStockOut(body: {
  outletId: string;
  productId: string;
  quantity: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<ApiResponse<{ movementId: string }>> {
  const { data } = await api.post<ApiResponse<{ movementId: string }>>('/inventory/movements/stock-out', body);
  return data;
}

export async function postAdjustment(body: {
  outletId: string;
  productId: string;
  type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT';
  quantity: number;
  note?: string;
  referenceType?: string;
  referenceId?: string;
}): Promise<ApiResponse<{ movementId: string }>> {
  const { data } = await api.post<ApiResponse<{ movementId: string }>>('/inventory/adjustments', body);
  return data;
}
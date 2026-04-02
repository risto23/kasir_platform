import { api } from './api';
import type {
  PromoDiscountType,
  PromoEffectiveStatus,
  PromoFormMeta,
  PromoItem,
  PromoListParams,
  PromoOutletScope,
  PromoPayload,
  PromoTargetType,
  PromoStatus,
} from '@/types/promo';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

function buildQuery(params: PromoListParams) {
  const searchParams = new URLSearchParams();

  if (params.search?.trim()) {
    searchParams.set('search', params.search.trim());
  }

  if (params.targetType) {
    searchParams.set('targetType', params.targetType);
  }

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (params.effectiveStatus) {
    searchParams.set('effectiveStatus', params.effectiveStatus);
  }

  if (params.outletScope) {
    searchParams.set('outletScope', params.outletScope);
  }

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export async function getPromoFormMeta(): Promise<PromoFormMeta> {
  const response = await api.get<ApiResponse<PromoFormMeta>>('/promos/meta/form');
  return response.data.data;
}

export async function getPromos(
  params: PromoListParams = {},
): Promise<PromoItem[]> {
  const response = await api.get<ApiResponse<PromoItem[]>>(
    `/promos${buildQuery(params)}`,
  );
  return response.data.data;
}

export async function getPromoById(id: string): Promise<PromoItem> {
  const response = await api.get<ApiResponse<PromoItem>>(`/promos/${id}`);
  return response.data.data;
}

export async function createPromo(payload: PromoPayload): Promise<PromoItem> {
  const response = await api.post<ApiResponse<PromoItem>>('/promos', payload);
  return response.data.data;
}

export async function updatePromo(
  id: string,
  payload: PromoPayload,
): Promise<PromoItem> {
  const response = await api.put<ApiResponse<PromoItem>>(`/promos/${id}`, payload);
  return response.data.data;
}

export async function updatePromoStatus(
  id: string,
  status: PromoStatus,
): Promise<PromoItem> {
  const response = await api.patch<ApiResponse<PromoItem>>(
    `/promos/${id}/status`,
    { status },
  );
  return response.data.data;
}

export function getPromoTargetTypeLabel(type: PromoTargetType): string {
  if (type === 'CATEGORY') {
    return 'Kategori';
  }

  if (type === 'PRODUCT') {
    return 'Produk/Menu';
  }

  if (type === 'PRODUCT_NAME') {
    return 'Nama Produk/Menu';
  }

  if (type === 'BRAND') {
    return 'Brand';
  }

  return 'Satuan';
}

export function getPromoDiscountTypeLabel(type: PromoDiscountType): string {
  if (type === 'PERCENTAGE') {
    return 'Persentase';
  }

  return 'Nominal';
}

export function getPromoStatusLabel(
  status: PromoStatus | PromoEffectiveStatus,
): string {
  if (status === 'ACTIVE') {
    return 'Aktif';
  }

  if (status === 'INACTIVE') {
    return 'Nonaktif';
  }

  if (status === 'SCHEDULED') {
    return 'Terjadwal';
  }

  return 'Berakhir';
}

export function getPromoOutletScopeLabel(scope: PromoOutletScope): string {
  if (scope === 'ALL_OUTLETS') {
    return 'Semua Outlet';
  }

  return 'Outlet Tertentu';
}

export function formatPromoTargetValue(
  targetType: PromoTargetType,
  value: string | null,
): string {
  if (!value) {
    return '-';
  }

  if (targetType === 'CATEGORY') {
    return `Kategori: ${value}`;
  }

  if (targetType === 'PRODUCT') {
    return `Produk/Menu: ${value}`;
  }

  if (targetType === 'PRODUCT_NAME') {
    return `Nama: ${value}`;
  }

  if (targetType === 'BRAND') {
    return `Brand: ${value}`;
  }

  return `Satuan: ${value}`;
}

export function formatPromoPeriod(item: PromoItem): string {
  return `${item.startDate} ${item.startTime} - ${item.endDate} ${item.endTime}`;
}
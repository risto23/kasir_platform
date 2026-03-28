'use client';

import type {
  PromoEffectiveStatus,
  PromoFormMeta,
  PromoItem,
  PromoListFilters,
  PromoPayload,
  PromoStatus,
} from '@/types/promo';

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

function normalizeBaseUrl(value: string) {
  return value.replace(/\/+$/, '');
}

function getApiBaseUrl() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

  if (!baseUrl) {
    throw new Error('NEXT_PUBLIC_API_BASE_URL belum diatur');
  }

  return normalizeBaseUrl(baseUrl);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseStoredValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function deepFindStringByKeys(
  value: unknown,
  keys: string[],
  visited = new WeakSet<object>(),
): string | null {
  if (typeof value === 'string') {
    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  if (visited.has(value)) {
    return null;
  }

  visited.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (
      keys.includes(key) &&
      typeof child === 'string' &&
      child.trim().length > 0
    ) {
      return child.trim();
    }

    const nested = deepFindStringByKeys(child, keys, visited);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function readFromStorageKeys(keys: string[]) {
  for (const key of keys) {
    const raw = window.localStorage.getItem(key);

    if (typeof raw === 'string' && raw.trim().length > 0) {
      return raw.trim();
    }
  }

  return null;
}

function findValueInAllStorage(keys: string[]) {
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const storageKey = window.localStorage.key(index);

    if (!storageKey) {
      continue;
    }

    const raw = window.localStorage.getItem(storageKey);

    if (!raw) {
      continue;
    }

    const parsed = parseStoredValue(raw);
    const found = deepFindStringByKeys(parsed, keys);

    if (found) {
      return found;
    }
  }

  return null;
}

function getAccessToken() {
  const direct = readFromStorageKeys([
    'accessToken',
    'access_token',
    'token',
    'authToken',
    'pos_access_token',
  ]);

  if (direct) {
    return direct;
  }

  const nested = findValueInAllStorage([
    'accessToken',
    'access_token',
    'token',
    'authToken',
    'pos_access_token',
  ]);

  if (nested) {
    return nested;
  }

  throw new Error('Token login tidak ditemukan di storage');
}

function getActiveBusinessId() {
  const direct = readFromStorageKeys([
    'activeBusinessId',
    'businessId',
    'currentBusinessId',
    'selectedBusinessId',
    'pos_active_business_id',
  ]);

  if (direct) {
    return direct;
  }

  const nested = findValueInAllStorage([
    'activeBusinessId',
    'businessId',
    'currentBusinessId',
    'selectedBusinessId',
    'pos_active_business_id',
  ]);

  if (nested) {
    return nested;
  }

  throw new Error('Business aktif tidak ditemukan di storage');
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const businessId = getActiveBusinessId();

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'x-business-id': businessId,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });

  const json = (await response.json().catch(() => null)) as ApiResponse<T> | null;

  if (!response.ok || !json?.success) {
    throw new Error(
      json?.message || `Request gagal dengan status ${response.status}`,
    );
  }

  return json.data;
}

function buildQuery(filters: PromoListFilters) {
  const params = new URLSearchParams();

  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.targetType) {
    params.set('targetType', filters.targetType);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.effectiveStatus) {
    params.set('effectiveStatus', filters.effectiveStatus);
  }

  const query = params.toString();
  return query ? `?${query}` : '';
}

export async function getPromoFormMeta() {
  return request<PromoFormMeta>('/promos/meta/form');
}

export async function getPromos(filters: PromoListFilters = {}) {
  return request<PromoItem[]>(`/promos${buildQuery(filters)}`);
}

export async function getPromoById(id: string) {
  return request<PromoItem>(`/promos/${id}`);
}

export async function createPromo(payload: PromoPayload) {
  return request<PromoItem>('/promos', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updatePromo(id: string, payload: PromoPayload) {
  return request<PromoItem>(`/promos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function updatePromoStatus(id: string, status: PromoStatus) {
  return request<PromoItem>(`/promos/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export function getPromoTargetTypeLabel(value: string) {
  switch (value) {
    case 'CATEGORY':
      return 'Kategori';
    case 'PRODUCT':
      return 'Produk Tertentu';
    case 'PRODUCT_NAME':
      return 'Nama Produk/Menu';
    case 'BRAND':
      return 'Brand';
    case 'UNIT':
      return 'Satuan';
    default:
      return value;
  }
}

export function getPromoDiscountTypeLabel(value: string) {
  switch (value) {
    case 'PERCENTAGE':
      return 'Persen';
    case 'FIXED_AMOUNT':
      return 'Nominal';
    default:
      return value;
  }
}

export function getPromoStatusLabel(value: string) {
  switch (value) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'INACTIVE':
      return 'INACTIVE';
    case 'SCHEDULED':
      return 'SCHEDULED';
    case 'EXPIRED':
      return 'EXPIRED';
    default:
      return value;
  }
}

export function formatPromoPeriod(item: {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
}) {
  return `${item.startDate} ${item.startTime} - ${item.endDate} ${item.endTime}`;
}

export function formatPromoTargetValue(
  targetType: string,
  targetLabel: string | null,
) {
  if (!targetLabel) {
    if (targetType === 'CATEGORY') {
      return '-';
    }

    if (targetType === 'PRODUCT') {
      return '-';
    }

    return '-';
  }

  return targetLabel;
}

export function isEffectiveStatus(value: string): value is PromoEffectiveStatus {
  return (
    value === 'ACTIVE' ||
    value === 'INACTIVE' ||
    value === 'SCHEDULED' ||
    value === 'EXPIRED'
  );
}
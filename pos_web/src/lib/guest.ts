import type {
  CreateGuestOrderApiResponse,
  CreateGuestOrderPayload,
  CreatedGuestOrderResponse,
  GetGuestMenuApiResponse,
  GuestCartStorage,
  GuestMenuResponse,
} from '@/types/guest';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'http://localhost:4000/api';

const GUEST_CART_STORAGE_KEY = 'pos_guest_cart_v1';

export async function getGuestMenu(
  params: {
    outletId: string;
    tableId: string;
    token: string;
  },
  options?: {
    signal?: AbortSignal;
  },
): Promise<GuestMenuResponse> {
  const outletId = params.outletId.trim();
  const tableId = params.tableId.trim();
  const token = params.token.trim();

  if (!outletId) {
    throw new Error('outletId wajib diisi.');
  }

  if (!tableId) {
    throw new Error('tableId wajib diisi.');
  }

  if (!token) {
    throw new Error('token wajib diisi.');
  }

  const searchParams = new URLSearchParams({
    tableId,
    token,
  });

  const response = await fetch(
    `${API_BASE_URL}/outlets/${encodeURIComponent(outletId)}/guest/menu?${searchParams.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
      signal: options?.signal,
    },
  );

  const result = (await response.json()) as Partial<GetGuestMenuApiResponse>;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message ?? 'Gagal mengambil guest menu.');
  }

  return result.data;
}

export async function createGuestOrder(
  params: {
    outletId: string;
    payload: CreateGuestOrderPayload;
  },
  options?: {
    signal?: AbortSignal;
  },
): Promise<CreatedGuestOrderResponse> {
  const outletId = params.outletId.trim();

  if (!outletId) {
    throw new Error('outletId wajib diisi.');
  }

  const response = await fetch(
    `${API_BASE_URL}/outlets/${encodeURIComponent(outletId)}/guest/orders`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params.payload),
      cache: 'no-store',
      signal: options?.signal,
    },
  );

  const result = (await response.json()) as Partial<CreateGuestOrderApiResponse>;

  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message ?? 'Gagal membuat guest order.');
  }

  return result.data;
}

export function getGuestCart(): GuestCartStorage | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const rawValue = window.sessionStorage.getItem(GUEST_CART_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as GuestCartStorage;
  } catch {
    return null;
  }
}

export function saveGuestCart(payload: GuestCartStorage): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(payload));
}

export function clearGuestCart(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(GUEST_CART_STORAGE_KEY);
}

import type {
  CreateGuestOrderApiResponse,
  CreateGuestOrderPayload,
  CreatedGuestOrderResponse,
  GetGuestMenuApiResponse,
  GuestCartStorage,
  GuestChargeSummary,
  GuestMenuChargeRule,
  GuestMenuResponse,
  GuestMenuRoundingSetting,
} from '@/types/guest';
import { API_BASE_URL } from '@/lib/api-config';

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

function roundCharge(value: number): number {
  return Math.round(value * 100) / 100;
}

function roundByMethod(
  value: number,
  unit: number,
  method: GuestMenuRoundingSetting['method'],
): number {
  if (method === 'NONE' || unit <= 1) return value;
  const quotient = value / unit;
  if (method === 'NEAREST') return Math.round(quotient) * unit;
  if (method === 'CEIL') return Math.ceil(quotient) * unit;
  return Math.floor(quotient) * unit;
}

/**
 * Preview of the guest order total. Mirrors applyChargesAndRounding in
 * pos_api/src/modules/pos-settings/pos-settings.service.ts, which
 * createGuestOrder uses to bill the order. Keep both in sync.
 */
export function calculateGuestCharges(
  subtotal: number,
  charges: GuestMenuChargeRule[] | undefined,
  rounding: GuestMenuRoundingSetting | undefined,
): GuestChargeSummary {
  let taxAmount = 0;
  let serviceChargeAmount = 0;
  let otherChargeAmount = 0;

  for (const rule of charges ?? []) {
    const amount = rule.type === 'PERCENTAGE' ? (subtotal * rule.value) / 100 : rule.value;
    const key = rule.key.toUpperCase();

    if (key === 'TAX') taxAmount += amount;
    else if (key === 'SERVICE') serviceChargeAmount += amount;
    else otherChargeAmount += amount;
  }

  const preRound = roundCharge(subtotal + taxAmount + serviceChargeAmount + otherChargeAmount);
  const grandTotal =
    rounding && rounding.enabled
      ? roundByMethod(preRound, Math.max(1, rounding.unit), rounding.method)
      : preRound;

  return {
    subtotal,
    taxAmount: roundCharge(taxAmount),
    serviceChargeAmount: roundCharge(serviceChargeAmount),
    otherChargeAmount: roundCharge(otherChargeAmount),
    roundingAmount: roundCharge(grandTotal - preRound),
    grandTotal,
  };
}

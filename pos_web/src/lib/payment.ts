import { api } from './api';
import { getActiveBusinessId } from './auth';
import type {
  PaymentHistoryDetailResponse,
  PaymentHistoryItem,
  PaymentHistoryListParams,
  PaymentHistoryListResponse,
  PaymentHistoryMeta,
} from '@/types/payment';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Partial<PaymentHistoryMeta>;
};

type PaymentApiRow = {
  id: string;
  paymentNumber: string;
  orderId: string;
  businessId: string;
  outletId: string;
  method: PaymentHistoryItem['method'];
  status: PaymentHistoryItem['status'];
  amountPaid?: string | number | null;
  amountTendered?: string | number | null;
  changeAmount?: string | number | null;
  note?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  receipt?: {
    id: string;
    receiptNumber: string;
  } | null;
  receiptId?: string | null;
  receiptNumber?: string | null;
};

function getBusinessIdOrThrow(): string {
  const businessId = getActiveBusinessId();

  if (!businessId) {
    throw new Error('Business aktif belum dipilih');
  }

  return businessId;
}

function buildScopedHeaders(outletId?: string): Record<string, string> {
  const headers: Record<string, string> = {
    'x-business-id': getBusinessIdOrThrow(),
  };

  if (outletId) {
    headers['x-outlet-id'] = outletId;
  }

  return headers;
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeMeta(meta?: Partial<PaymentHistoryMeta>): PaymentHistoryMeta {
  return {
    page: meta?.page ?? 1,
    perPage: meta?.perPage ?? 10,
    total: meta?.total ?? 0,
    totalPages: meta?.totalPages ?? 1,
  };
}

function mapPayment(row: PaymentApiRow): PaymentHistoryItem {
  const amountPaid = toNumber(row.amountPaid);
  const amountTendered = toNumber(row.amountTendered);
  const changeAmount = toNumber(row.changeAmount);

  return {
    id: row.id,
    paymentNumber: row.paymentNumber,
    orderId: row.orderId,
    businessId: row.businessId,
    outletId: row.outletId,
    method: row.method,
    status: row.status,
    amountPaid,
    amountTendered,
    changeAmount,
    note: row.note ?? null,
    paidAt: row.paidAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    receipt: row.receipt ?? null,
    receiptId: row.receiptId ?? row.receipt?.id ?? null,
    receiptNumber: row.receiptNumber ?? row.receipt?.receiptNumber ?? null,

    amount: amountPaid,
  };
}

export function formatPaymentCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPaymentDateTime(value: string | null | undefined): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export async function getPaymentHistory(
  params: PaymentHistoryListParams,
): Promise<PaymentHistoryListResponse> {
  const response = await api.get<ApiEnvelope<PaymentApiRow[]>>('/payments', {
    params: {
      outletId: params.outletId,
      page: params.page ?? 1,
      perPage: params.perPage ?? 20,
      orderId: params.orderId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
      ...(params.dateTo ? { dateTo: params.dateTo } : {}),
    },
    headers: buildScopedHeaders(params.outletId),
  });

  const rows = Array.isArray(response.data.data) ? response.data.data : [];

  return {
    items: rows.map(mapPayment),
    meta: normalizeMeta(response.data.meta),
  };
}

export async function getPaymentDetail(
  paymentId: string,
  outletId: string,
): Promise<PaymentHistoryDetailResponse> {
  const response = await api.get<ApiEnvelope<PaymentApiRow>>(`/payments/${paymentId}`, {
    params: {
      outletId,
    },
    headers: buildScopedHeaders(outletId),
  });

  if (!response.data.data) {
    throw new Error('Detail payment tidak ditemukan');
  }

  return mapPayment(response.data.data);
}
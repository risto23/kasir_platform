// pos_web/src/lib/order.ts
import { api } from './api';
import { getActiveBusinessId } from './auth';
import type {
  OrderHistoryDetailResponse,
  OrderHistoryItem,
  OrderHistoryListParams,
  OrderHistoryListResponse,
  OrderHistoryMeta,
  OrderHistoryStatus,
  OrderPaymentStatus,
} from '@/types/order';

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Partial<OrderHistoryMeta>;
};

type OrderApiRow = {
  id: string;
  orderNumber?: string | null;
  businessId: string;
  outletId: string;
  outletName?: string | null;
  tableId?: string | null;
  tableName?: string | null;
  status?: OrderHistoryStatus | null;
  paymentStatus?: OrderPaymentStatus | null;
  itemCount?: string | number | null;
  subtotal?: string | number | null;
  discountAmount?: string | number | null;
  taxAmount?: string | number | null;
  serviceChargeAmount?: string | number | null;
  totalAmount?: string | number | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
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

function normalizeMeta(meta?: Partial<OrderHistoryMeta>): OrderHistoryMeta {
  return {
    page: meta?.page ?? 1,
    perPage: meta?.perPage ?? 10,
    total: meta?.total ?? 0,
    totalPages: meta?.totalPages ?? 1,
  };
}

function mapOrder(row: OrderApiRow): OrderHistoryItem {
  const totalAmount = toNumber(row.totalAmount);

  return {
    id: row.id,
    orderNumber: row.orderNumber ?? row.id,
    businessId: row.businessId,
    outletId: row.outletId,
    outletName: row.outletName ?? null,
    tableId: row.tableId ?? null,
    tableName: row.tableName ?? null,
    status: row.status ?? 'DRAFT',
    paymentStatus: row.paymentStatus ?? 'UNPAID',
    itemCount: toNumber(row.itemCount),
    subtotal: toNumber(row.subtotal),
    discountAmount: toNumber(row.discountAmount),
    taxAmount: toNumber(row.taxAmount),
    serviceChargeAmount: toNumber(row.serviceChargeAmount),
    totalAmount,
    notes: row.notes ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,

    orderNo: row.orderNumber ?? row.id,
    total: totalAmount,
  };
}

export function formatOrderCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatOrderDateTime(value: string | null | undefined): string {
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

export async function getOrderHistory(
  params: OrderHistoryListParams,
): Promise<OrderHistoryListResponse> {
  const response = await api.get<ApiEnvelope<OrderApiRow[]>>('/orders', {
    params: {
      outletId: params.outletId,
      page: params.page ?? 1,
      perPage: params.perPage ?? 20,
      search: params.search,
    },
    headers: buildScopedHeaders(params.outletId),
  });

  const rows = Array.isArray(response.data.data) ? response.data.data : [];

  return {
    items: rows.map(mapOrder),
    meta: normalizeMeta(response.data.meta),
  };
}

export async function getOrderDetail(
  orderId: string,
  outletId: string,
): Promise<OrderHistoryDetailResponse> {
  const response = await api.get<ApiEnvelope<OrderApiRow>>(`/orders/${orderId}`, {
    params: {
      outletId,
    },
    headers: buildScopedHeaders(outletId),
  });

  if (!response.data.data) {
    throw new Error('Detail order tidak ditemukan');
  }

  return mapOrder(response.data.data);
}
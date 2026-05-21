import { api } from './api';
import { getActiveBusinessId } from './auth';
import type { ReceiptDetailResponse } from '@/types/receipt';

type ReceiptMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Partial<ReceiptMeta>;
};

type ReceiptApiRow = {
  id: string;
  receiptNumber: string;
  businessId: string;
  outletId: string;
  businessName?: string | null;
  outletName?: string | null;
  outletAddress?: string | null;
  issuedAt: string;
  printedAt?: string | null;
  order?: {
    id: string;
    orderNumber: string;
    status: ReceiptDetailResponse['order'] extends infer T
      ? T extends { status: infer S }
        ? S
        : never
      : never;
    paymentStatus: ReceiptDetailResponse['order'] extends infer T
      ? T extends { paymentStatus: infer S }
        ? S
        : never
      : never;
    subtotal?: string | number | null;
    discountAmount?: string | number | null;
    taxAmount?: string | number | null;
    serviceChargeAmount?: string | number | null;
    totalAmount?: string | number | null;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    method: ReceiptDetailResponse['payment'] extends infer T
      ? T extends { method: infer S }
        ? S
        : never
      : never;
    status: ReceiptDetailResponse['payment'] extends infer T
      ? T extends { status: infer S }
        ? S
        : never
      : never;
    amountPaid?: string | number | null;
    amountTendered?: string | number | null;
    changeAmount?: string | number | null;
    paidAt?: string | null;
  } | null;
  contentSnapshot?: {
    orderId: string;
    orderNumber: string;
    businessName: string;
    outletName: string;
    outletAddress?: string | null;
    outletPhone?: string | null;
    brandName?: string | null;
    logoUrl?: string | null;
    headerText?: string | null;
    footerText?: string | null;
    showBusinessName?: boolean;
    showOutletName?: boolean;
    showOutletAddress?: boolean;
    showOutletPhone?: boolean;
    tableName?: string | null;
    notes?: string | null;
    subtotal?: string | number | null;
    discountAmount?: string | number | null;
    taxAmount?: string | number | null;
    serviceChargeAmount?: string | number | null;
    totalAmount?: string | number | null;
    items?: Array<{
      id: string;
      productName: string;
      productCode?: string | null;
      productSku?: string | null;
      productBarcode?: string | null;
      quantity?: string | number | null;
      unitPrice?: string | number | null;
      lineSubtotal?: string | number | null;
      lineDiscountAmount?: string | number | null;
      lineTotal?: string | number | null;
      note?: string | null;
      status?: string;
    }>;
  } | null;
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

function getStoredOutletId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('activeOutletId');
}

function resolveOutletId(outletId?: string): string {
  const resolved = outletId || getStoredOutletId();

  if (!resolved) {
    throw new Error('Outlet aktif belum dipilih');
  }

  return resolved;
}

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function mapReceipt(row: ReceiptApiRow): ReceiptDetailResponse {
  const snapshot = row.contentSnapshot
      ? {
          orderId: row.contentSnapshot.orderId,
          orderNumber: row.contentSnapshot.orderNumber,
          businessName: row.contentSnapshot.businessName,
          outletName: row.contentSnapshot.outletName,
          outletAddress: row.contentSnapshot.outletAddress ?? null,
          outletPhone: row.contentSnapshot.outletPhone ?? null,
          brandName: row.contentSnapshot.brandName ?? null,
          logoUrl: row.contentSnapshot.logoUrl ?? null,
          headerText: row.contentSnapshot.headerText ?? null,
          footerText: row.contentSnapshot.footerText ?? null,
          showBusinessName: row.contentSnapshot.showBusinessName ?? true,
          showOutletName: row.contentSnapshot.showOutletName ?? true,
          showOutletAddress: row.contentSnapshot.showOutletAddress ?? true,
          showOutletPhone: row.contentSnapshot.showOutletPhone ?? true,
          tableName: row.contentSnapshot.tableName ?? null,
          notes: row.contentSnapshot.notes ?? null,
          subtotal: toNumber(row.contentSnapshot.subtotal),
        discountAmount: toNumber(row.contentSnapshot.discountAmount),
        taxAmount: toNumber(row.contentSnapshot.taxAmount),
        serviceChargeAmount: toNumber(row.contentSnapshot.serviceChargeAmount),
        totalAmount: toNumber(row.contentSnapshot.totalAmount),
        items: Array.isArray(row.contentSnapshot.items)
          ? row.contentSnapshot.items.map((item) => {
              const quantity = toNumber(item.quantity);
              const unitPrice = toNumber(item.unitPrice);
              const lineSubtotal = toNumber(item.lineSubtotal);

              return {
                id: item.id,
                productName: item.productName,
                productCode: item.productCode ?? null,
                productSku: item.productSku ?? null,
                productBarcode: item.productBarcode ?? null,
                quantity,
                unitPrice,
                lineSubtotal,
                lineDiscountAmount: toNumber(item.lineDiscountAmount),
                lineTotal: toNumber(item.lineTotal),
                note: item.note ?? null,
                status: item.status ?? 'PENDING',

                qty: quantity,
                price: unitPrice,
                subtotal: lineSubtotal,
              };
            })
          : [],
      }
    : null;

  return {
    id: row.id,
    receiptNumber: row.receiptNumber,
    paymentId: row.payment?.id ?? null,
    orderId: row.order?.id ?? snapshot?.orderId ?? '',
    businessId: row.businessId,
    outletId: row.outletId,
    businessName: row.businessName ?? snapshot?.businessName ?? null,
    outletName: row.outletName ?? snapshot?.outletName ?? null,
    outletAddress: row.outletAddress ?? snapshot?.outletAddress ?? null,
    issuedAt: row.issuedAt,
    printedAt: row.printedAt ?? null,
    deletedAt: (row as { deletedAt?: string | null }).deletedAt ?? null,
    createdAt: row.issuedAt,
    contentSnapshot: snapshot,
    order: row.order
      ? {
          id: row.order.id,
          orderNumber: row.order.orderNumber,
          status: row.order.status,
          paymentStatus: row.order.paymentStatus,
          subtotal: toNumber(row.order.subtotal),
          discountAmount: toNumber(row.order.discountAmount),
          taxAmount: toNumber(row.order.taxAmount),
          serviceChargeAmount: toNumber(row.order.serviceChargeAmount),
          totalAmount: toNumber(row.order.totalAmount),
        }
      : undefined,
    payment: row.payment
      ? {
          id: row.payment.id,
          paymentNumber: row.payment.paymentNumber,
          method: row.payment.method,
          status: row.payment.status,
          amountPaid: toNumber(row.payment.amountPaid),
          amountTendered: toNumber(row.payment.amountTendered),
          changeAmount: toNumber(row.payment.changeAmount),
          paidAt: row.payment.paidAt ?? null,
        }
      : null,

    receiptNo: row.receiptNumber,
    total: toNumber(row.order?.totalAmount ?? snapshot?.totalAmount ?? 0),
  };
}

export function formatReceiptCurrency(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatReceiptDateTime(value: string | null | undefined): string {
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

export async function getReceiptDetail(
  receiptId: string,
  outletId?: string,
): Promise<ReceiptDetailResponse> {
  const resolvedOutletId = resolveOutletId(outletId);

  const response = await api.get<ApiEnvelope<ReceiptApiRow>>(`/receipts/${receiptId}`, {
    params: {
      outletId: resolvedOutletId,
    },
    headers: buildScopedHeaders(resolvedOutletId),
  });

  if (!response.data.data) {
    throw new Error('Detail receipt tidak ditemukan');
  }

  return mapReceipt(response.data.data);
}

export async function getReceiptByOrderId(
  orderId: string,
  outletId?: string,
): Promise<ReceiptDetailResponse> {
  const resolvedOutletId = resolveOutletId(outletId);

  const response = await api.get<ApiEnvelope<ReceiptApiRow>>(
    `/receipts/order/${orderId}`,
    {
      params: {
        outletId: resolvedOutletId,
      },
      headers: buildScopedHeaders(resolvedOutletId),
    },
  );

  if (!response.data.data) {
    throw new Error('Receipt order tidak ditemukan');
  }

  return mapReceipt(response.data.data);
}

export async function softDeleteReceipt(
  receiptId: string,
  outletId?: string,
): Promise<void> {
  const resolvedOutletId = resolveOutletId(outletId);
  await api.delete(`/receipts/${receiptId}`, {
    params: { outletId: resolvedOutletId },
    headers: buildScopedHeaders(resolvedOutletId),
  });
}

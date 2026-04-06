import { createHmac } from 'crypto';
import {
  BusinessType,
  OrderItemStatus,
  OrderStatus,
  OutletTableStatus,
  PaymentStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  ActiveOrderMonitor,
  OutletTableMonitorResponse,
  TableMonitorItem,
  TableMonitorItemSummary,
  TableMonitorStatus,
  TableQrResponse,
} from './restaurant-operations.types';

class RestaurantOperationsError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const TOKEN_VERSION = 'v1';
const TOKEN_PREFIX = 'guestqr';

function toNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === 'number') {
    return value;
  }

  return Number(value);
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(2));
}

async function getRestaurantOutletOrThrow(outletId: string) {
  const outlet = await prisma.outlet.findFirst({
    where: {
      id: outletId,
      status: 'ACTIVE',
      business: {
        status: 'ACTIVE',
        businessType: BusinessType.RESTAURANT,
      },
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      code: true,
      business: {
        select: {
          id: true,
          businessType: true,
        },
      },
    },
  });

  if (!outlet) {
    throw new RestaurantOperationsError('Outlet restaurant tidak ditemukan', 404);
  }

  return outlet;
}

async function getRestaurantTableOrThrow(outletId: string, tableId: string) {
  const table = await prisma.outletTable.findFirst({
    where: {
      id: tableId,
      outletId,
      status: OutletTableStatus.ACTIVE,
      outlet: {
        status: 'ACTIVE',
        business: {
          status: 'ACTIVE',
          businessType: BusinessType.RESTAURANT,
        },
      },
    },
    select: {
      id: true,
      outletId: true,
      code: true,
      name: true,
      capacity: true,
      status: true,
      outlet: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!table) {
    throw new RestaurantOperationsError('Meja outlet tidak ditemukan', 404);
  }

  return table;
}

function getGuestQrSecret(): string {
  const explicitSecret =
    process.env.GUEST_QR_SECRET ??
    process.env.POS_GUEST_QR_SECRET ??
    process.env.JWT_SECRET;

  if (typeof explicitSecret === 'string' && explicitSecret.trim() !== '') {
    return explicitSecret.trim();
  }

  return 'pos-platform-secret';
}

function buildTableQrToken(outletId: string, tableId: string): string {
  const secret = getGuestQrSecret();
  const rawPayload = `${TOKEN_PREFIX}:${TOKEN_VERSION}:${outletId}:${tableId}`;
  const signature = createHmac('sha256', secret).update(rawPayload).digest('hex');

  return `${rawPayload}:${signature}`;
}

function getFrontendBaseUrl(): string {
  const rawValue =
    process.env.PUBLIC_APP_URL ??
    process.env.FRONTEND_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'http://localhost:3000';

  return rawValue.endsWith('/') ? rawValue.slice(0, -1) : rawValue;
}

function buildGuestMenuUrl(outletId: string, tableId: string, token: string): string {
  const baseUrl = getFrontendBaseUrl();
  const query = new URLSearchParams({
    outletId,
    tableId,
    token,
  });

  return `${baseUrl}/guest/menu?${query.toString()}`;
}

function buildItemSummary(
  items: Array<{
    status: OrderItemStatus;
    quantity: number;
  }>,
): TableMonitorItemSummary {
  const summary: TableMonitorItemSummary = {
    pending: 0,
    processing: 0,
    done: 0,
    served: 0,
    cancelled: 0,
  };

  for (const item of items) {
    switch (item.status) {
      case OrderItemStatus.PENDING:
        summary.pending += item.quantity;
        break;
      case OrderItemStatus.PROCESSING:
        summary.processing += item.quantity;
        break;
      case OrderItemStatus.DONE:
        summary.done += item.quantity;
        break;
      case OrderItemStatus.SERVED:
        summary.served += item.quantity;
        break;
      case OrderItemStatus.CANCELLED:
        summary.cancelled += item.quantity;
        break;
      default:
        break;
    }
  }

  return summary;
}

function getMonitorStatusFromActiveOrder(
  activeOrder: ActiveOrderMonitor | null,
): TableMonitorStatus {
  if (!activeOrder) {
    return 'AVAILABLE';
  }

  if (
    activeOrder.status === OrderStatus.DRAFT &&
    activeOrder.paymentStatus !== PaymentStatus.PAID
  ) {
    return 'WAITING_PAYMENT';
  }

  const nonCancelledItems = activeOrder.items.filter(
    (item) => item.status !== OrderItemStatus.CANCELLED,
  );

  if (nonCancelledItems.length === 0) {
    return activeOrder.paymentStatus === PaymentStatus.PAID
      ? 'SERVED'
      : 'WAITING_PAYMENT';
  }

  const allServed = nonCancelledItems.every(
    (item) => item.status === OrderItemStatus.SERVED,
  );

  if (allServed) {
    return activeOrder.paymentStatus === PaymentStatus.PAID
      ? 'SERVED'
      : 'WAITING_PAYMENT';
  }

  const allDoneOrServed = nonCancelledItems.every(
    (item) =>
      item.status === OrderItemStatus.DONE ||
      item.status === OrderItemStatus.SERVED,
  );

  if (allDoneOrServed) {
    return 'READY_TO_SERVE';
  }

  const hasProcessing = nonCancelledItems.some(
    (item) => item.status === OrderItemStatus.PROCESSING,
  );

  if (hasProcessing) {
    return 'PROCESSING';
  }

  if (activeOrder.paymentStatus !== PaymentStatus.PAID) {
    return 'WAITING_PAYMENT';
  }

  return 'WAITING_KITCHEN';
}

export async function getTableQr(
  outletId: string,
  tableId: string,
): Promise<TableQrResponse> {
  const table = await getRestaurantTableOrThrow(outletId, tableId);
  const token = buildTableQrToken(outletId, tableId);
  const guestMenuUrl = buildGuestMenuUrl(outletId, tableId, token);

  return {
    outlet: {
      id: table.outlet.id,
      name: table.outlet.name,
      code: table.outlet.code,
    },
    table: {
      id: table.id,
      code: table.code,
      name: table.name,
      capacity: table.capacity,
      status: table.status,
    },
    token,
    guestMenuUrl,
    qrValue: guestMenuUrl,
  };
}

export async function getOutletTableMonitor(
  outletId: string,
): Promise<OutletTableMonitorResponse> {
  const outlet = await getRestaurantOutletOrThrow(outletId);

  const tables = await prisma.outletTable.findMany({
    where: {
      outletId,
      status: OutletTableStatus.ACTIVE,
    },
    select: {
      id: true,
      code: true,
      name: true,
      capacity: true,
      status: true,
      orders: {
        where: {
          status: {
            in: [
              OrderStatus.DRAFT,
              OrderStatus.SUBMITTED,
              OrderStatus.IN_PROGRESS,
              OrderStatus.READY,
            ],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          notes: true,
          createdAt: true,
          submittedAt: true,
          totalAmount: true,
          items: {
            orderBy: {
              createdAt: 'asc',
            },
            select: {
              status: true,
              quantity: true,
            },
          },
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  });

  const items: TableMonitorItem[] = tables.map((table) => {
    const activeOrderRaw = table.orders[0];

    const activeOrder: ActiveOrderMonitor | null = activeOrderRaw
      ? {
          id: activeOrderRaw.id,
          orderNumber: activeOrderRaw.orderNumber,
          status: activeOrderRaw.status,
          paymentStatus: activeOrderRaw.paymentStatus,
          notes: activeOrderRaw.notes,
          createdAt: activeOrderRaw.createdAt,
          submittedAt: activeOrderRaw.submittedAt,
          totalAmount: roundCurrency(toNumber(activeOrderRaw.totalAmount)),
          items: activeOrderRaw.items.map((item) => ({
            status: item.status,
            quantity: toNumber(item.quantity),
          })),
        }
      : null;

    const monitorStatus = getMonitorStatusFromActiveOrder(activeOrder);

    const itemSummary = activeOrder
      ? buildItemSummary(activeOrder.items)
      : {
          pending: 0,
          processing: 0,
          done: 0,
          served: 0,
          cancelled: 0,
        };

    const totalItems = activeOrder
      ? activeOrder.items.reduce((sum, item) => sum + item.quantity, 0)
      : 0;

    return {
      id: table.id,
      code: table.code,
      name: table.name,
      capacity: table.capacity,
      tableStatus: table.status,
      monitorStatus,
      activeOrder: activeOrder
        ? {
            id: activeOrder.id,
            orderNumber: activeOrder.orderNumber,
            status: activeOrder.status,
            paymentStatus: activeOrder.paymentStatus,
            notes: activeOrder.notes,
            createdAt: activeOrder.createdAt.toISOString(),
            submittedAt: activeOrder.submittedAt
              ? activeOrder.submittedAt.toISOString()
              : null,
            totalAmount: activeOrder.totalAmount,
            totalItems,
            itemSummary,
          }
        : null,
    };
  });

  const summary = items.reduce(
    (accumulator, item) => {
      accumulator.totalTables += 1;

      if (item.monitorStatus === 'AVAILABLE') {
        accumulator.availableTables += 1;
      } else {
        accumulator.occupiedTables += 1;
      }

      if (item.monitorStatus === 'WAITING_PAYMENT') {
        accumulator.waitingPaymentTables += 1;
      }

      if (item.monitorStatus === 'READY_TO_SERVE') {
        accumulator.readyTables += 1;
      }

      return accumulator;
    },
    {
      totalTables: 0,
      availableTables: 0,
      occupiedTables: 0,
      waitingPaymentTables: 0,
      readyTables: 0,
    },
  );

  return {
    outlet: {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
    },
    summary,
    items,
  };
}

export function getRestaurantOperationsErrorStatus(error: unknown): number {
  if (error instanceof RestaurantOperationsError) {
    return error.statusCode;
  }

  return 500;
}

export function getRestaurantOperationsErrorMessage(error: unknown): string {
  if (error instanceof RestaurantOperationsError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan pada restaurant operations';
}
// pos_api/src/modules/kitchen/kitchen.service.ts
import {
  BusinessType,
  OrderItemStatus,
  OrderStatus,
  Prisma,
} from '@prisma/client';
import { prisma } from '../../config/prisma';

type KitchenBusinessAccess = {
  businessId: string;
  businessType: BusinessType;
  status: 'ACTIVE' | 'INACTIVE';
  hasAllOutletAccess: boolean;
  allowedOutletIds: string[];
};

type KitchenQueueFilter = 'WAITING' | 'PROCESSING' | 'READY';

type ListKitchenOrdersArgs = {
  businessAccess: KitchenBusinessAccess | undefined;
  outletId: string;
  page: number;
  perPage: number;
  queue?: KitchenQueueFilter;
};

type UpdateKitchenOrderItemStatusArgs = {
  businessAccess: KitchenBusinessAccess | undefined;
  orderId: string;
  itemId: string;
  status: OrderItemStatus;
};

class KitchenServiceError extends Error {
  statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'KitchenServiceError';
    this.statusCode = statusCode;
  }
}

function assertBusinessAccess(
  businessAccess: KitchenBusinessAccess | undefined,
): asserts businessAccess is KitchenBusinessAccess {
  if (!businessAccess) {
    throw new KitchenServiceError(
      'Business access context belum tersedia',
      403,
    );
  }

  if (businessAccess.status !== 'ACTIVE') {
    throw new KitchenServiceError('User business tidak aktif', 403);
  }

  if (businessAccess.businessType !== BusinessType.RESTAURANT) {
    throw new KitchenServiceError(
      'Kitchen hanya tersedia untuk business type restaurant',
      400,
    );
  }
}

function ensureOutletAccess(
  businessAccess: KitchenBusinessAccess,
  outletId: string,
) {
  if (businessAccess.hasAllOutletAccess) {
    return;
  }

  if (!businessAccess.allowedOutletIds.includes(outletId)) {
    throw new KitchenServiceError(
      'Tidak memiliki akses ke outlet ini',
      403,
    );
  }
}

async function ensureActiveRestaurantOutlet(
  businessId: string,
  outletId: string,
) {
  const outlet = await prisma.outlet.findFirst({
    where: {
      id: outletId,
      businessId,
      status: 'ACTIVE',
      business: {
        status: 'ACTIVE',
        businessType: BusinessType.RESTAURANT,
      },
    },
    select: {
      id: true,
      businessId: true,
      code: true,
      name: true,
    },
  });

  if (!outlet) {
    throw new KitchenServiceError(
      'Outlet restaurant tidak ditemukan',
      404,
    );
  }

  return outlet;
}

function validateKitchenItemStatusTransition(
  currentStatus: OrderItemStatus,
  nextStatus: OrderItemStatus,
) {
  const allowedTransitions: Record<OrderItemStatus, OrderItemStatus[]> = {
    PENDING: [OrderItemStatus.PROCESSING, OrderItemStatus.CANCELLED],
    PROCESSING: [OrderItemStatus.DONE, OrderItemStatus.CANCELLED],
    DONE: [OrderItemStatus.SERVED],
    SERVED: [],
    CANCELLED: [],
  };

  const allowedNextStatuses = allowedTransitions[currentStatus];

  if (!allowedNextStatuses.includes(nextStatus)) {
    throw new KitchenServiceError(
      `Transisi status item tidak valid: ${currentStatus} -> ${nextStatus}`,
      400,
    );
  }
}

function resolveOrderStatusAfterKitchenUpdate(
  currentOrderStatus: OrderStatus,
  itemStatuses: OrderItemStatus[],
): OrderStatus {
  const activeStatuses = itemStatuses.filter(
    (itemStatus) => itemStatus !== OrderItemStatus.CANCELLED,
  );

  if (activeStatuses.length === 0) {
    return currentOrderStatus;
  }

  const allDoneOrServed = activeStatuses.every(
    (itemStatus) =>
      itemStatus === OrderItemStatus.DONE ||
      itemStatus === OrderItemStatus.SERVED,
  );

  if (allDoneOrServed) {
    return OrderStatus.READY;
  }

  const hasStartedProgress = activeStatuses.some(
    (itemStatus) =>
      itemStatus === OrderItemStatus.PROCESSING ||
      itemStatus === OrderItemStatus.DONE ||
      itemStatus === OrderItemStatus.SERVED,
  );

  if (hasStartedProgress) {
    return currentOrderStatus === OrderStatus.READY
      ? OrderStatus.READY
      : OrderStatus.IN_PROGRESS;
  }

  const allPending = activeStatuses.every(
    (itemStatus) => itemStatus === OrderItemStatus.PENDING,
  );

  if (allPending) {
    return currentOrderStatus === OrderStatus.DRAFT
      ? OrderStatus.DRAFT
      : OrderStatus.SUBMITTED;
  }

  return currentOrderStatus;
}

function mapKitchenOrder(
  order: {
    id: string;
    orderNumber: string;
    outletId: string;
    tableId: string | null;
    notes: string | null;
    status: OrderStatus;
    submittedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
    table: {
      id: string;
      code: string;
      name: string;
      capacity: number | null;
    } | null;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      productCode: string | null;
      productSku: string | null;
      productBarcode: string | null;
      quantity: Prisma.Decimal;
      note: string | null;
      status: OrderItemStatus;
      createdAt: Date;
      updatedAt: Date;
    }>;
  },
) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    outletId: order.outletId,
    tableId: order.tableId,
    notes: order.notes,
    status: order.status,
    submittedAt: order.submittedAt,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    table: order.table
      ? {
          id: order.table.id,
          code: order.table.code,
          name: order.table.name,
          capacity: order.table.capacity,
        }
      : null,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      productSku: item.productSku,
      productBarcode: item.productBarcode,
      quantity: item.quantity.toString(),
      note: item.note,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

export async function listKitchenOrders(args: ListKitchenOrdersArgs) {
  const { businessAccess, outletId, page, perPage, queue } = args;

  assertBusinessAccess(businessAccess);
  ensureOutletAccess(businessAccess, outletId);
  await ensureActiveRestaurantOutlet(businessAccess.businessId, outletId);

  const skip = (page - 1) * perPage;

  const where: Prisma.OrderWhereInput = {
    businessId: businessAccess.businessId,
    outletId,
    status: {
      in: [
        OrderStatus.SUBMITTED,
        OrderStatus.IN_PROGRESS,
        OrderStatus.READY,
      ],
    },
    items: {
      some: {
        status: {
          in: [
            OrderItemStatus.PENDING,
            OrderItemStatus.PROCESSING,
            OrderItemStatus.DONE,
          ],
        },
      },
    },
  };

  if (queue === 'WAITING') {
    where.status = OrderStatus.SUBMITTED;
  }

  if (queue === 'PROCESSING') {
    where.status = OrderStatus.IN_PROGRESS;
  }

  if (queue === 'READY') {
    where.status = OrderStatus.READY;
  }

  const [total, orders] = await prisma.$transaction([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      skip,
      take: perPage,
      orderBy: [
        {
          submittedAt: 'asc',
        },
        {
          createdAt: 'asc',
        },
      ],
      select: {
        id: true,
        orderNumber: true,
        outletId: true,
        tableId: true,
        notes: true,
        status: true,
        submittedAt: true,
        createdAt: true,
        updatedAt: true,
        table: {
          select: {
            id: true,
            code: true,
            name: true,
            capacity: true,
          },
        },
        items: {
          where: {
            status: {
              in: [
                OrderItemStatus.PENDING,
                OrderItemStatus.PROCESSING,
                OrderItemStatus.DONE,
              ],
            },
          },
          orderBy: [
            {
              createdAt: 'asc',
            },
          ],
          select: {
            id: true,
            productId: true,
            productName: true,
            productCode: true,
            productSku: true,
            productBarcode: true,
            quantity: true,
            note: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    }),
  ]);

  return {
    items: orders.map((order) => mapKitchenOrder(order)),
    meta: {
      page,
      perPage,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / perPage),
    },
  };
}

export async function updateKitchenOrderItemStatus(
  args: UpdateKitchenOrderItemStatusArgs,
) {
  const { businessAccess, orderId, itemId, status } = args;

  assertBusinessAccess(businessAccess);

  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: orderId,
        businessId: businessAccess.businessId,
      },
      select: {
        id: true,
        orderNumber: true,
        businessId: true,
        outletId: true,
        status: true,
        tableId: true,
        table: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        items: {
          orderBy: {
            createdAt: 'asc',
          },
          select: {
            id: true,
            productId: true,
            productName: true,
            productCode: true,
            productSku: true,
            productBarcode: true,
            quantity: true,
            note: true,
            status: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!order) {
      throw new KitchenServiceError('Order kitchen tidak ditemukan', 404);
    }

    await ensureActiveRestaurantOutlet(
      businessAccess.businessId,
      order.outletId,
    );
    ensureOutletAccess(businessAccess, order.outletId);

    if (
      order.status === OrderStatus.COMPLETED ||
      order.status === OrderStatus.CANCELLED
    ) {
      throw new KitchenServiceError(
        'Order yang sudah selesai atau dibatalkan tidak bisa diubah dari kitchen',
        400,
      );
    }

    const targetItem = order.items.find((item) => item.id === itemId);

    if (!targetItem) {
      throw new KitchenServiceError(
        'Item order tidak ditemukan pada order ini',
        404,
      );
    }

    validateKitchenItemStatusTransition(targetItem.status, status);

    const updatedItem = await tx.orderItem.update({
      where: {
        id: targetItem.id,
      },
      data: {
        status,
      },
      select: {
        id: true,
        productId: true,
        productName: true,
        productCode: true,
        productSku: true,
        productBarcode: true,
        quantity: true,
        note: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const nextItemStatuses = order.items.map((item) =>
      item.id === updatedItem.id ? updatedItem.status : item.status,
    );

    const nextOrderStatus = resolveOrderStatusAfterKitchenUpdate(
      order.status,
      nextItemStatuses,
    );

    let finalOrderStatus: OrderStatus = order.status;

    if (nextOrderStatus !== order.status) {
      await tx.order.update({
        where: {
          id: order.id,
        },
        data: {
          status: nextOrderStatus,
        },
      });

      finalOrderStatus = nextOrderStatus;
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      outletId: order.outletId,
      orderStatus: finalOrderStatus,
      table: order.table,
      item: {
        id: updatedItem.id,
        productId: updatedItem.productId,
        productName: updatedItem.productName,
        productCode: updatedItem.productCode,
        productSku: updatedItem.productSku,
        productBarcode: updatedItem.productBarcode,
        quantity: updatedItem.quantity.toString(),
        note: updatedItem.note,
        status: updatedItem.status,
        createdAt: updatedItem.createdAt,
        updatedAt: updatedItem.updatedAt,
      },
    };
  });

  return result;
}

export function getKitchenServiceErrorStatus(error: unknown) {
  if (error instanceof KitchenServiceError) {
    return error.statusCode;
  }

  return 500;
}

export function getKitchenServiceErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan pada modul kitchen';
}
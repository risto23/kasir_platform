import {
  BusinessType,
  OrderStatus,
  PaymentStatus,
  Prisma,
  ProductOutletStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  AddOrderItemInput,
  CreateOrderInput,
  CreateOrderItemInput,
  ListOrdersInput,
  OrderDetailDto,
  OrderSummaryDto,
  UpdateOrderItemInput,
  UpdateOrderStatusInput,
} from './order.types';

function toMoneyString(
  value: Prisma.Decimal | number | string | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '0';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  return Number(value).toFixed(2);
}

function buildOrderNumberPrefix(date = new Date()): string {
  const year = date.getFullYear().toString();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `ORD-${year}${month}${day}`;
}

async function generateOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const prefix = buildOrderNumberPrefix();
  const latestOrder = await tx.order.findFirst({
    where: {
      orderNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  });

  const latestSequence = latestOrder?.orderNumber
    ? Number(latestOrder.orderNumber.split('-').pop() ?? '0')
    : 0;

  const nextSequence = `${latestSequence + 1}`.padStart(4, '0');
  return `${prefix}-${nextSequence}`;
}

async function ensureOutletBelongsToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  outletId: string,
) {
  const outlet = await tx.outlet.findFirst({
    where: {
      id: outletId,
      businessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      address: true,
      business: {
        select: {
          id: true,
          name: true,
          businessType: true,
        },
      },
    },
  });

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan pada business aktif');
  }

  return outlet;
}

async function ensureBusinessUserBelongsToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  businessUserId: string,
) {
  const businessUser = await tx.businessUser.findFirst({
    where: {
      id: businessUserId,
      businessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  if (!businessUser) {
    throw new Error('Business user tidak ditemukan pada business aktif');
  }

  return businessUser;
}

async function ensureTableIsValidForOrder(
  tx: Prisma.TransactionClient,
  params: {
    businessType: BusinessType;
    outletId: string;
    tableId?: string;
  },
) {
  const { businessType, outletId, tableId } = params;

  if (businessType === BusinessType.RETAIL && tableId) {
    throw new Error('Retail tidak menggunakan meja pada transaksi');
  }

  if (businessType === BusinessType.RESTAURANT && !tableId) {
    throw new Error('Transaksi restaurant wajib memilih meja');
  }

  if (!tableId) {
    return null;
  }

  const table = await tx.outletTable.findFirst({
    where: {
      id: tableId,
      outletId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!table) {
    throw new Error('Meja outlet tidak ditemukan atau tidak aktif');
  }

  return table;
}

async function getProductPriceForOutlet(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    productId: string;
  },
) {
  const { businessId, outletId, productId } = params;

  const product = await tx.product.findFirst({
    where: {
      id: productId,
      businessId,
      status: 'ACTIVE',
    },
    include: {
      outletSettings: {
        where: {
          outletId,
        },
        take: 1,
      },
    },
  });

  if (!product) {
    throw new Error('Product tidak ditemukan atau tidak aktif');
  }

  const outletSetting = product.outletSettings[0];

  if (!outletSetting) {
    throw new Error('Product belum memiliki pengaturan outlet');
  }

  if (
    outletSetting.status !== ProductOutletStatus.ACTIVE ||
    !outletSetting.isAvailable
  ) {
    throw new Error(`Product ${product.name} tidak tersedia di outlet ini`);
  }

  const unitPrice = outletSetting.priceOverride ?? product.basePrice;

  return {
    product,
    unitPrice,
  };
}

async function recalculateOrderTotals(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      lineSubtotal: true,
      lineDiscountAmount: true,
      lineTotal: true,
    },
  });

  const subtotal = orderItems.reduce(
    (acc, item) => acc.plus(item.lineSubtotal),
    new Prisma.Decimal(0),
  );

  const discountAmount = orderItems.reduce(
    (acc, item) => acc.plus(item.lineDiscountAmount),
    new Prisma.Decimal(0),
  );

  const totalAmount = orderItems.reduce(
    (acc, item) => acc.plus(item.lineTotal),
    new Prisma.Decimal(0),
  );

  return tx.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      discountAmount,
      taxAmount: new Prisma.Decimal(0),
      serviceChargeAmount: new Prisma.Decimal(0),
      totalAmount,
    },
  });
}

function mapOrderSummary(order: {
  id: string;
  orderNumber: string;
  businessId: string;
  outletId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  tableId: string | null;
  table: { name: string } | null;
  notes: string | null;
  subtotal: Prisma.Decimal;
  discountAmount: Prisma.Decimal;
  taxAmount: Prisma.Decimal;
  serviceChargeAmount: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  items: { id: string }[];
}): OrderSummaryDto {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    businessId: order.businessId,
    outletId: order.outletId,
    status: order.status,
    paymentStatus: order.paymentStatus,
    tableId: order.tableId,
    tableName: order.table?.name ?? null,
    notes: order.notes,
    subtotal: toMoneyString(order.subtotal),
    discountAmount: toMoneyString(order.discountAmount),
    taxAmount: toMoneyString(order.taxAmount),
    serviceChargeAmount: toMoneyString(order.serviceChargeAmount),
    totalAmount: toMoneyString(order.totalAmount),
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    submittedAt: order.submittedAt ? order.submittedAt.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    itemCount: order.items.length,
  };
}

type OrderReader = Prisma.TransactionClient | typeof prisma;

async function getOrderByIdInternal(
  db: OrderReader,
  params: {
    businessId: string;
    outletId: string;
    orderId: string;
  },
): Promise<OrderDetailDto> {
  const order = await db.order.findFirst({
    where: {
      id: params.orderId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    include: {
      outlet: {
        select: {
          name: true,
          business: {
            select: {
              businessType: true,
            },
          },
        },
      },
      table: {
        select: {
          name: true,
        },
      },
      items: {
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order tidak ditemukan');
  }

  return {
    ...mapOrderSummary({
      ...order,
      table: order.table,
    }),
    businessType: order.outlet.business.businessType,
    outletName: order.outlet.name,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      productSku: item.productSku,
      productBarcode: item.productBarcode,
      quantity: toMoneyString(item.quantity),
      unitPrice: toMoneyString(item.unitPrice),
      lineSubtotal: toMoneyString(item.lineSubtotal),
      lineDiscountAmount: toMoneyString(item.lineDiscountAmount),
      lineTotal: toMoneyString(item.lineTotal),
      note: item.note,
      status: item.status,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

export async function listOrders(params: ListOrdersInput) {
  const where: Prisma.OrderWhereInput = {
    businessId: params.businessId,
    outletId: params.outletId,
    ...(params.status ? { status: params.status } : {}),
    ...(params.paymentStatus ? { paymentStatus: params.paymentStatus } : {}),
    ...(params.search
      ? {
          OR: [
            {
              orderNumber: {
                contains: params.search,
                mode: 'insensitive',
              },
            },
            {
              notes: {
                contains: params.search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const skip = (params.page - 1) * params.perPage;

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: {
        table: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: params.perPage,
    }),
  ]);

  return {
    items: rows.map(mapOrderSummary),
    meta: {
      page: params.page,
      perPage: params.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / params.perPage)),
    },
  };
}

export async function getOrderById(params: {
  businessId: string;
  outletId: string;
  orderId: string;
}): Promise<OrderDetailDto> {
  return getOrderByIdInternal(prisma, params);
}

async function createSingleOrderItem(
  tx: Prisma.TransactionClient,
  params: {
    orderId: string;
    businessId: string;
    outletId: string;
    item: CreateOrderItemInput;
  },
) {
  const pricing = await getProductPriceForOutlet(tx, {
    businessId: params.businessId,
    outletId: params.outletId,
    productId: params.item.productId,
  });

  const quantityDecimal = new Prisma.Decimal(params.item.quantity);
  const lineSubtotal = pricing.unitPrice.mul(quantityDecimal);
  const lineDiscountAmount = new Prisma.Decimal(0);
  const lineTotal = lineSubtotal.minus(lineDiscountAmount);

  return tx.orderItem.create({
    data: {
      orderId: params.orderId,
      productId: pricing.product.id,
      productName: pricing.product.name,
      productCode: pricing.product.code,
      productSku: pricing.product.sku,
      productBarcode: pricing.product.barcode,
      unitPrice: pricing.unitPrice,
      quantity: quantityDecimal,
      note: params.item.note?.trim() || null,
      lineSubtotal,
      lineDiscountAmount,
      lineTotal,
    },
  });
}

export async function createOrder(input: CreateOrderInput) {
  return prisma.$transaction(async (tx) => {
    const outlet = await ensureOutletBelongsToBusiness(
      tx,
      input.businessId,
      input.outletId,
    );

    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.businessUserId,
    );

    await ensureTableIsValidForOrder(tx, {
      businessType: outlet.business.businessType,
      outletId: input.outletId,
      tableId: input.tableId,
    });

    const orderNumber = await generateOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        createdByBusinessUserId: input.businessUserId,
        tableId: input.tableId ?? null,
        orderNumber,
        notes: input.notes?.trim() || null,
        status: OrderStatus.DRAFT,
        paymentStatus: PaymentStatus.UNPAID,
      },
      include: {
        table: {
          select: {
            name: true,
          },
        },
        items: {
          select: {
            id: true,
          },
        },
      },
    });

    for (const item of input.items ?? []) {
      await createSingleOrderItem(tx, {
        orderId: order.id,
        businessId: input.businessId,
        outletId: input.outletId,
        item,
      });
    }

    await recalculateOrderTotals(tx, order.id);

    return getOrderByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      orderId: order.id,
    });
  });
}

export async function addOrderItem(input: AddOrderItemInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: input.orderId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new Error('Hanya order draft yang bisa ditambah item');
    }

    await createSingleOrderItem(tx, {
      orderId: order.id,
      businessId: input.businessId,
      outletId: input.outletId,
      item: {
        productId: input.productId,
        quantity: input.quantity,
        note: input.note,
      },
    });

    await recalculateOrderTotals(tx, order.id);

    return getOrderByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      orderId: input.orderId,
    });
  });
}

export async function updateOrderItem(input: UpdateOrderItemInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: input.orderId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    if (order.status !== OrderStatus.DRAFT) {
      throw new Error('Hanya order draft yang bisa diubah');
    }

    const item = await tx.orderItem.findFirst({
      where: {
        id: input.itemId,
        orderId: input.orderId,
      },
      select: {
        id: true,
        unitPrice: true,
      },
    });

    if (!item) {
      throw new Error('Item order tidak ditemukan');
    }

    const quantityDecimal = new Prisma.Decimal(input.quantity);
    const lineSubtotal = item.unitPrice.mul(quantityDecimal);
    const lineDiscountAmount = new Prisma.Decimal(0);
    const lineTotal = lineSubtotal.minus(lineDiscountAmount);

    await tx.orderItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity: quantityDecimal,
        note: input.note?.trim() || null,
        lineSubtotal,
        lineDiscountAmount,
        lineTotal,
      },
    });

    await recalculateOrderTotals(tx, input.orderId);

    return getOrderByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      orderId: input.orderId,
    });
  });
}

function validateOrderStatusTransition(current: OrderStatus, next: OrderStatus) {
  const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
    DRAFT: [OrderStatus.SUBMITTED, OrderStatus.CANCELLED],
    SUBMITTED: [OrderStatus.IN_PROGRESS, OrderStatus.CANCELLED],
    IN_PROGRESS: [OrderStatus.READY, OrderStatus.CANCELLED],
    READY: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
    COMPLETED: [],
    CANCELLED: [],
  };

  const allowed = allowedTransitions[current] ?? [];
  if (!allowed.includes(next)) {
    throw new Error(`Transisi status order ${current} ke ${next} tidak diizinkan`);
  }
}

export async function updateOrderStatus(input: UpdateOrderStatusInput) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: input.orderId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      select: {
        id: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    if (order.status === input.status) {
      return getOrderByIdInternal(tx, {
        businessId: input.businessId,
        outletId: input.outletId,
        orderId: input.orderId,
      });
    }

    validateOrderStatusTransition(order.status, input.status);

    if (
      input.status === OrderStatus.COMPLETED &&
      order.paymentStatus !== PaymentStatus.PAID
    ) {
      throw new Error('Order hanya bisa diselesaikan jika status pembayaran sudah PAID');
    }

    const now = new Date();

    await tx.order.update({
      where: {
        id: order.id,
      },
      data: {
        status: input.status,
        submittedAt: input.status === OrderStatus.SUBMITTED ? now : undefined,
        completedAt: input.status === OrderStatus.COMPLETED ? now : undefined,
        cancelledAt: input.status === OrderStatus.CANCELLED ? now : undefined,
      },
    });

    if (input.status === OrderStatus.CANCELLED) {
      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
        },
        data: {
          status: 'CANCELLED',
        },
      });
    }

    if (input.status === OrderStatus.SUBMITTED) {
      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: 'PENDING',
        },
        data: {
          status: 'PROCESSING',
        },
      });
    }

    if (input.status === OrderStatus.IN_PROGRESS) {
      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
        data: {
          status: 'PROCESSING',
        },
      });
    }

    if (input.status === OrderStatus.READY) {
      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: {
            in: ['PENDING', 'PROCESSING'],
          },
        },
        data: {
          status: 'DONE',
        },
      });
    }

    if (input.status === OrderStatus.COMPLETED) {
      await tx.orderItem.updateMany({
        where: {
          orderId: order.id,
          status: {
            not: 'CANCELLED',
          },
        },
        data: {
          status: 'SERVED',
        },
      });
    }

    return getOrderByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      orderId: input.orderId,
    });
  });
}
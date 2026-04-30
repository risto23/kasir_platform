import { Prisma, ProductStatus, PurchaseOrderStatus, SupplierStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  CreatePurchaseOrderInput,
  ListPurchaseOrdersInput,
  PurchaseOrderDetailDto,
  PurchaseOrderItemPayload,
  PurchaseOrderSummaryDto,
  UpdatePurchaseOrderInput,
  UpdatePurchaseOrderStatusInput,
} from './purchase-orders.types';

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function toMoneyString(
  value: Prisma.Decimal | number | string | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '0.00';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(2);
  }

  return Number(value).toFixed(2);
}

function toQuantityString(
  value: Prisma.Decimal | number | string | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '0.000';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(3);
  }

  return Number(value).toFixed(3);
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

function buildPurchaseOrderNumberPrefix(date = new Date()): string {
  const year = date.getFullYear().toString();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `PO-${year}${month}${day}`;
}

async function generatePurchaseOrderNumber(
  tx: Prisma.TransactionClient,
  orderDate: Date,
): Promise<string> {
  const prefix = buildPurchaseOrderNumberPrefix(orderDate);
  const latestPurchaseOrder = await tx.purchaseOrder.findFirst({
    where: {
      poNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      poNumber: 'desc',
    },
    select: {
      poNumber: true,
    },
  });

  const latestSequence = latestPurchaseOrder?.poNumber
    ? Number(latestPurchaseOrder.poNumber.split('-').pop() ?? '0')
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
      name: true,
      businessId: true,
    },
  });

  if (!outlet) {
    throw createHttpError('Outlet tidak ditemukan pada business aktif.', 404);
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
    throw createHttpError('Business user tidak ditemukan pada business aktif.', 404);
  }

  return businessUser;
}

async function ensureSupplierBelongsToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  supplierId: string,
) {
  const supplier = await tx.supplier.findFirst({
    where: {
      id: supplierId,
      businessId,
    },
    select: {
      id: true,
      code: true,
      name: true,
      status: true,
    },
  });

  if (!supplier) {
    throw createHttpError('Supplier tidak ditemukan pada business aktif.', 404);
  }

  if (supplier.status !== SupplierStatus.ACTIVE) {
    throw createHttpError('Supplier tidak aktif.', 400);
  }

  return supplier;
}

type PurchaseOrderReader = Prisma.TransactionClient | typeof prisma;

async function getPurchaseOrderByIdInternal(
  db: PurchaseOrderReader,
  params: {
    businessId: string;
    outletId: string;
    purchaseOrderId: string;
  },
): Promise<PurchaseOrderDetailDto> {
  const purchaseOrder = await db.purchaseOrder.findFirst({
    where: {
      id: params.purchaseOrderId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    include: {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      outlet: {
        select: {
          id: true,
          name: true,
        },
      },
      items: {
        orderBy: {
          createdAt: 'asc',
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
  });

  if (!purchaseOrder) {
    throw createHttpError('Purchase order tidak ditemukan.', 404);
  }

  return {
    id: purchaseOrder.id,
    businessId: purchaseOrder.businessId,
    outletId: purchaseOrder.outletId,
    supplierId: purchaseOrder.supplierId,
    supplierName: purchaseOrder.supplier.name,
    supplierCode: purchaseOrder.supplier.code,
    poNumber: purchaseOrder.poNumber,
    orderDate: purchaseOrder.orderDate.toISOString(),
    expectedDate: purchaseOrder.expectedDate
      ? purchaseOrder.expectedDate.toISOString()
      : null,
    notes: purchaseOrder.notes,
    status: purchaseOrder.status,
    subtotal: toMoneyString(purchaseOrder.subtotal),
    totalAmount: toMoneyString(purchaseOrder.totalAmount),
    submittedAt: purchaseOrder.submittedAt
      ? purchaseOrder.submittedAt.toISOString()
      : null,
    cancelledAt: purchaseOrder.cancelledAt
      ? purchaseOrder.cancelledAt.toISOString()
      : null,
    createdAt: purchaseOrder.createdAt.toISOString(),
    updatedAt: purchaseOrder.updatedAt.toISOString(),
    itemCount: purchaseOrder._count.items,
    outletName: purchaseOrder.outlet.name,
    createdByBusinessUserId: purchaseOrder.createdByBusinessUserId,
    items: purchaseOrder.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      productSku: item.productSku,
      productBarcode: item.productBarcode,
      unit: item.unit,
      quantityOrdered: toQuantityString(item.quantityOrdered),
      quantityReceived: toQuantityString(item.quantityReceived),
      unitCost: toMoneyString(item.unitCost),
      lineSubtotal: toMoneyString(item.lineSubtotal),
      note: item.note,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

async function ensurePurchaseOrderExists(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    purchaseOrderId: string;
  },
) {
  const purchaseOrder = await tx.purchaseOrder.findFirst({
    where: {
      id: params.purchaseOrderId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!purchaseOrder) {
    throw createHttpError('Purchase order tidak ditemukan.', 404);
  }

  return purchaseOrder;
}

function validatePurchaseOrderEditable(status: PurchaseOrderStatus) {
  if (status !== PurchaseOrderStatus.DRAFT) {
    throw createHttpError('Hanya purchase order draft yang bisa diubah.', 400);
  }
}

function validatePurchaseOrderStatusTransition(
  current: PurchaseOrderStatus,
  next: PurchaseOrderStatus,
) {
  const allowedTransitions: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
    DRAFT: [PurchaseOrderStatus.SUBMITTED, PurchaseOrderStatus.CANCELLED],
    SUBMITTED: [PurchaseOrderStatus.CANCELLED],
    PARTIALLY_RECEIVED: [],
    RECEIVED: [],
    CANCELLED: [],
  };

  const allowed = allowedTransitions[current] ?? [];

  if (!allowed.includes(next)) {
    throw createHttpError(
      `Transisi status purchase order ${current} ke ${next} tidak diizinkan.`,
      400,
    );
  }
}

async function buildPurchaseOrderItems(
  tx: Prisma.TransactionClient,
  businessId: string,
  items: PurchaseOrderItemPayload[],
) {
  const seenProductIds = new Set<string>();

  for (const item of items) {
    if (seenProductIds.has(item.productId)) {
      throw createHttpError('Product pada purchase order tidak boleh duplikat.', 400);
    }

    seenProductIds.add(item.productId);
  }

  const productIds = items.map((item) => item.productId);
  const products = await tx.product.findMany({
    where: {
      businessId,
      id: {
        in: productIds,
      },
    },
    select: {
      id: true,
      name: true,
      code: true,
      sku: true,
      barcode: true,
      unit: true,
      status: true,
    },
  });

  if (products.length !== productIds.length) {
    throw createHttpError('Ada product purchase order yang tidak ditemukan.', 404);
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  const rows = items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw createHttpError('Product purchase order tidak ditemukan.', 404);
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw createHttpError(`Product ${product.name} tidak aktif.`, 400);
    }

    const quantityOrdered = new Prisma.Decimal(item.quantity);
    const unitCost = new Prisma.Decimal(item.unitCost);
    const lineSubtotal = quantityOrdered.mul(unitCost);

    return {
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      productSku: product.sku,
      productBarcode: product.barcode,
      unit: product.unit,
      quantityOrdered,
      quantityReceived: new Prisma.Decimal(0),
      unitCost,
      lineSubtotal,
      note: normalizeNullableText(item.note),
    };
  });

  const subtotal = rows.reduce(
    (acc, item) => acc.plus(item.lineSubtotal),
    new Prisma.Decimal(0),
  );

  return {
    rows,
    subtotal,
    totalAmount: subtotal,
  };
}

function mapPurchaseOrderSummary(order: {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  poNumber: string;
  orderDate: Date;
  expectedDate: Date | null;
  notes: string | null;
  status: PurchaseOrderStatus;
  subtotal: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  submittedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    id: string;
    code: string;
    name: string;
  };
  _count: {
    items: number;
  };
}): PurchaseOrderSummaryDto {
  return {
    id: order.id,
    businessId: order.businessId,
    outletId: order.outletId,
    supplierId: order.supplierId,
    supplierName: order.supplier.name,
    supplierCode: order.supplier.code,
    poNumber: order.poNumber,
    orderDate: order.orderDate.toISOString(),
    expectedDate: order.expectedDate ? order.expectedDate.toISOString() : null,
    notes: order.notes,
    status: order.status,
    subtotal: toMoneyString(order.subtotal),
    totalAmount: toMoneyString(order.totalAmount),
    submittedAt: order.submittedAt ? order.submittedAt.toISOString() : null,
    cancelledAt: order.cancelledAt ? order.cancelledAt.toISOString() : null,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    itemCount: order._count.items,
  };
}

export async function listPurchaseOrders(input: ListPurchaseOrdersInput) {
  const search = normalizeSearch(input.search);

  const where: Prisma.PurchaseOrderWhereInput = {
    businessId: input.businessId,
    outletId: input.outletId,
    ...(input.status
      ? {
          status: input.status,
        }
      : {}),
    ...(input.supplierId
      ? {
          supplierId: input.supplierId,
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              poNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              notes: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              supplier: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              supplier: {
                code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
          ],
        }
      : {}),
  };

  const skip = (input.page - 1) * input.perPage;

  const [total, rows] = await Promise.all([
    prisma.purchaseOrder.count({ where }),
    prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
      orderBy: [
        {
          orderDate: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
      skip,
      take: input.perPage,
    }),
  ]);

  return {
    items: rows.map(mapPurchaseOrderSummary),
    meta: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}

export async function getPurchaseOrderById(params: {
  businessId: string;
  outletId: string;
  purchaseOrderId: string;
}) {
  return getPurchaseOrderByIdInternal(prisma, params);
}

export async function createPurchaseOrder(input: CreatePurchaseOrderInput) {
  return prisma.$transaction(async (tx) => {
    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);
    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.businessUserId,
    );
    await ensureSupplierBelongsToBusiness(tx, input.businessId, input.supplierId);

    const builtItems = await buildPurchaseOrderItems(
      tx,
      input.businessId,
      input.items,
    );
    const poNumber = await generatePurchaseOrderNumber(tx, input.orderDate);

    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        supplierId: input.supplierId,
        createdByBusinessUserId: input.businessUserId,
        poNumber,
        orderDate: input.orderDate,
        expectedDate: input.expectedDate,
        notes: normalizeNullableText(input.notes),
        status: PurchaseOrderStatus.DRAFT,
        subtotal: builtItems.subtotal,
        totalAmount: builtItems.totalAmount,
        items: {
          create: builtItems.rows,
        },
      },
      select: {
        id: true,
      },
    });

    await tx.supplier.update({
      where: {
        id: input.supplierId,
      },
      data: {
        lastOrderAt: new Date(),
      },
    });

    return getPurchaseOrderByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseOrderId: purchaseOrder.id,
    });
  });
}

export async function updatePurchaseOrder(input: UpdatePurchaseOrderInput) {
  return prisma.$transaction(async (tx) => {
    const purchaseOrder = await ensurePurchaseOrderExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseOrderId: input.purchaseOrderId,
    });

    validatePurchaseOrderEditable(purchaseOrder.status);

    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);
    await ensureSupplierBelongsToBusiness(tx, input.businessId, input.supplierId);

    const builtItems = await buildPurchaseOrderItems(
      tx,
      input.businessId,
      input.items,
    );

    await tx.purchaseOrder.update({
      where: {
        id: input.purchaseOrderId,
      },
      data: {
        supplierId: input.supplierId,
        orderDate: input.orderDate,
        expectedDate: input.expectedDate,
        notes: normalizeNullableText(input.notes),
        subtotal: builtItems.subtotal,
        totalAmount: builtItems.totalAmount,
        items: {
          deleteMany: {},
          create: builtItems.rows,
        },
      },
    });

    await tx.supplier.update({
      where: {
        id: input.supplierId,
      },
      data: {
        lastOrderAt: new Date(),
      },
    });

    return getPurchaseOrderByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseOrderId: input.purchaseOrderId,
    });
  });
}

export async function updatePurchaseOrderStatus(
  input: UpdatePurchaseOrderStatusInput,
) {
  return prisma.$transaction(async (tx) => {
    const purchaseOrder = await ensurePurchaseOrderExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseOrderId: input.purchaseOrderId,
    });

    if (purchaseOrder.status === input.status) {
      return getPurchaseOrderByIdInternal(tx, {
        businessId: input.businessId,
        outletId: input.outletId,
        purchaseOrderId: input.purchaseOrderId,
      });
    }

    validatePurchaseOrderStatusTransition(purchaseOrder.status, input.status);

    const now = new Date();

    await tx.purchaseOrder.update({
      where: {
        id: input.purchaseOrderId,
      },
      data: {
        status: input.status,
        submittedAt:
          input.status === PurchaseOrderStatus.SUBMITTED ? now : undefined,
        cancelledAt:
          input.status === PurchaseOrderStatus.CANCELLED ? now : undefined,
      },
    });

    return getPurchaseOrderByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseOrderId: input.purchaseOrderId,
    });
  });
}

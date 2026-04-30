import {
  GoodsReceiptStatus,
  InventoryMovementType,
  Prisma,
  ProductStatus,
  PurchaseOrderStatus,
  SupplierStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { ensureAutoSupplierInvoiceForPostedGoodsReceiptTx } from '../supplier-invoices/supplier-invoices.service';
import type {
  CreateGoodsReceiptInput,
  GoodsReceiptDetailDto,
  GoodsReceiptItemPayload,
  GoodsReceiptSummaryDto,
  GoodsReceiptPostInput,
  GoodsReceiptVoidInput,
  ListGoodsReceiptsInput,
  UpdateGoodsReceiptInput,
} from './goods-receipts.types';

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

function buildGoodsReceiptNumberPrefix(date = new Date()): string {
  const year = date.getFullYear().toString();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `GR-${year}${month}${day}`;
}

async function generateGoodsReceiptNumber(
  tx: Prisma.TransactionClient,
  receiptDate: Date,
): Promise<string> {
  const prefix = buildGoodsReceiptNumberPrefix(receiptDate);
  const latestGoodsReceipt = await tx.goodsReceipt.findFirst({
    where: {
      receiptNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNumber: 'desc',
    },
    select: {
      receiptNumber: true,
    },
  });

  const latestSequence = latestGoodsReceipt?.receiptNumber
    ? Number(latestGoodsReceipt.receiptNumber.split('-').pop() ?? '0')
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

async function ensurePurchaseOrderForReceipt(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    supplierId: string;
    purchaseOrderId: string;
  },
) {
  const purchaseOrder = await tx.purchaseOrder.findFirst({
    where: {
      id: params.purchaseOrderId,
      businessId: params.businessId,
      outletId: params.outletId,
      supplierId: params.supplierId,
    },
    include: {
      items: true,
    },
  });

  if (!purchaseOrder) {
    throw createHttpError(
      'Purchase order tidak ditemukan atau tidak sesuai dengan supplier/outlet.',
      404,
    );
  }

  if (
    purchaseOrder.status !== PurchaseOrderStatus.SUBMITTED &&
    purchaseOrder.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
  ) {
    throw createHttpError(
      'Goods receipt hanya bisa dibuat dari purchase order yang sudah submitted atau partially received.',
      400,
    );
  }

  return purchaseOrder;
}

type GoodsReceiptReader = Prisma.TransactionClient | typeof prisma;

async function getGoodsReceiptByIdInternal(
  db: GoodsReceiptReader,
  params: {
    businessId: string;
    outletId: string;
    goodsReceiptId: string;
  },
): Promise<GoodsReceiptDetailDto> {
  const goodsReceipt = await db.goodsReceipt.findFirst({
    where: {
      id: params.goodsReceiptId,
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
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
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

  if (!goodsReceipt) {
    throw createHttpError('Goods receipt tidak ditemukan.', 404);
  }

  return {
    id: goodsReceipt.id,
    businessId: goodsReceipt.businessId,
    outletId: goodsReceipt.outletId,
    supplierId: goodsReceipt.supplierId,
    purchaseOrderId: goodsReceipt.purchaseOrderId,
    supplierName: goodsReceipt.supplier.name,
    supplierCode: goodsReceipt.supplier.code,
    purchaseOrderNumber: goodsReceipt.purchaseOrder?.poNumber ?? null,
    receiptNumber: goodsReceipt.receiptNumber,
    receiptDate: goodsReceipt.receiptDate.toISOString(),
    supplierInvoiceNumber: goodsReceipt.supplierInvoiceNumber,
    notes: goodsReceipt.notes,
    status: goodsReceipt.status,
    subtotal: toMoneyString(goodsReceipt.subtotal),
    totalAmount: toMoneyString(goodsReceipt.totalAmount),
    postedAt: goodsReceipt.postedAt ? goodsReceipt.postedAt.toISOString() : null,
    voidedAt: goodsReceipt.voidedAt ? goodsReceipt.voidedAt.toISOString() : null,
    createdAt: goodsReceipt.createdAt.toISOString(),
    updatedAt: goodsReceipt.updatedAt.toISOString(),
    itemCount: goodsReceipt._count.items,
    outletName: goodsReceipt.outlet.name,
    createdByBusinessUserId: goodsReceipt.createdByBusinessUserId,
    postedByBusinessUserId: goodsReceipt.postedByBusinessUserId,
    items: goodsReceipt.items.map((item) => ({
      id: item.id,
      purchaseOrderItemId: item.purchaseOrderItemId,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      productSku: item.productSku,
      productBarcode: item.productBarcode,
      unit: item.unit,
      quantityReceived: toQuantityString(item.quantityReceived),
      quantityAccepted: toQuantityString(item.quantityAccepted),
      quantityRejected: toQuantityString(item.quantityRejected),
      quantityReturned: toQuantityString(item.quantityReturned),
      unitCost: toMoneyString(item.unitCost),
      lineSubtotal: toMoneyString(item.lineSubtotal),
      note: item.note,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

async function ensureGoodsReceiptExists(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    goodsReceiptId: string;
  },
) {
  const goodsReceipt = await tx.goodsReceipt.findFirst({
    where: {
      id: params.goodsReceiptId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    select: {
      id: true,
      purchaseOrderId: true,
      status: true,
    },
  });

  if (!goodsReceipt) {
    throw createHttpError('Goods receipt tidak ditemukan.', 404);
  }

  return goodsReceipt;
}

function validateGoodsReceiptEditable(status: GoodsReceiptStatus) {
  if (status !== GoodsReceiptStatus.DRAFT) {
    throw createHttpError('Hanya goods receipt draft yang bisa diubah.', 400);
  }
}

async function buildGoodsReceiptItems(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    purchaseOrderId?: string;
    items: GoodsReceiptItemPayload[];
  },
) {
  const seenProductIds = new Set<string>();

  for (const item of params.items) {
    if (seenProductIds.has(item.productId)) {
      throw createHttpError('Product pada goods receipt tidak boleh duplikat.', 400);
    }

    seenProductIds.add(item.productId);
  }

  const productIds = params.items.map((item) => item.productId);
  const products = await tx.product.findMany({
    where: {
      businessId: params.businessId,
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
    throw createHttpError('Ada product goods receipt yang tidak ditemukan.', 404);
  }

  const productMap = new Map(products.map((product) => [product.id, product]));

  let purchaseOrderItemMap = new Map<
    string,
    {
      id: string;
      productId: string;
      quantityOrdered: Prisma.Decimal;
      quantityReceived: Prisma.Decimal;
      unitCost: Prisma.Decimal;
    }
  >();
  let purchaseOrderItemByProductMap = new Map<
    string,
    {
      id: string;
      productId: string;
      quantityOrdered: Prisma.Decimal;
      quantityReceived: Prisma.Decimal;
      unitCost: Prisma.Decimal;
    }
  >();

  if (params.purchaseOrderId) {
    const purchaseOrderItems = await tx.purchaseOrderItem.findMany({
      where: {
        purchaseOrderId: params.purchaseOrderId,
      },
      select: {
        id: true,
        productId: true,
        quantityOrdered: true,
        quantityReceived: true,
        unitCost: true,
      },
    });

    purchaseOrderItemMap = new Map(
      purchaseOrderItems.map((item) => [item.id, item]),
    );
    purchaseOrderItemByProductMap = new Map(
      purchaseOrderItems.map((item) => [item.productId, item]),
    );
  }

  const rows = params.items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw createHttpError('Product goods receipt tidak ditemukan.', 404);
    }

    if (product.status !== ProductStatus.ACTIVE) {
      throw createHttpError(`Product ${product.name} tidak aktif.`, 400);
    }

    let linkedPurchaseOrderItemId: string | null = null;

    if (params.purchaseOrderId) {
      const purchaseOrderItem = item.purchaseOrderItemId
        ? purchaseOrderItemMap.get(item.purchaseOrderItemId)
        : purchaseOrderItemByProductMap.get(item.productId);

      if (!purchaseOrderItem) {
        throw createHttpError(
          `Product ${product.name} tidak ditemukan pada purchase order terkait.`,
          400,
        );
      }

      if (purchaseOrderItem.productId !== item.productId) {
        throw createHttpError(
          `Item purchase order tidak sesuai dengan product ${product.name}.`,
          400,
        );
      }

      linkedPurchaseOrderItemId = purchaseOrderItem.id;
    } else if (item.purchaseOrderItemId) {
      throw createHttpError(
        'purchaseOrderItemId tidak boleh diisi jika goods receipt tidak memakai purchase order.',
        400,
      );
    }

    const quantityAccepted = new Prisma.Decimal(item.quantityAccepted);
    const quantityReceived = new Prisma.Decimal(item.quantityAccepted);
    const quantityRejected = new Prisma.Decimal(0);
    const unitCost = new Prisma.Decimal(item.unitCost);
    const lineSubtotal = quantityAccepted.mul(unitCost);

    return {
      purchaseOrderItemId: linkedPurchaseOrderItemId,
      productId: product.id,
      productName: product.name,
      productCode: product.code,
      productSku: product.sku,
      productBarcode: product.barcode,
      unit: product.unit,
      quantityReceived,
      quantityAccepted,
      quantityRejected,
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

function mapGoodsReceiptSummary(receipt: {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  purchaseOrderId: string | null;
  receiptNumber: string;
  receiptDate: Date;
  supplierInvoiceNumber: string | null;
  notes: string | null;
  status: GoodsReceiptStatus;
  subtotal: Prisma.Decimal;
  totalAmount: Prisma.Decimal;
  postedAt: Date | null;
  voidedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  supplier: {
    code: string;
    name: string;
  };
  purchaseOrder: {
    poNumber: string;
  } | null;
  _count: {
    items: number;
  };
}): GoodsReceiptSummaryDto {
  return {
    id: receipt.id,
    businessId: receipt.businessId,
    outletId: receipt.outletId,
    supplierId: receipt.supplierId,
    purchaseOrderId: receipt.purchaseOrderId,
    supplierName: receipt.supplier.name,
    supplierCode: receipt.supplier.code,
    purchaseOrderNumber: receipt.purchaseOrder?.poNumber ?? null,
    receiptNumber: receipt.receiptNumber,
    receiptDate: receipt.receiptDate.toISOString(),
    supplierInvoiceNumber: receipt.supplierInvoiceNumber,
    notes: receipt.notes,
    status: receipt.status,
    subtotal: toMoneyString(receipt.subtotal),
    totalAmount: toMoneyString(receipt.totalAmount),
    postedAt: receipt.postedAt ? receipt.postedAt.toISOString() : null,
    voidedAt: receipt.voidedAt ? receipt.voidedAt.toISOString() : null,
    createdAt: receipt.createdAt.toISOString(),
    updatedAt: receipt.updatedAt.toISOString(),
    itemCount: receipt._count.items,
  };
}

async function ensureInventoryItemTx(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    productId: string;
  },
) {
  const existing = await tx.inventoryItem.findFirst({
    where: {
      businessId: params.businessId,
      outletId: params.outletId,
      productId: params.productId,
    },
  });

  if (existing) {
    return existing;
  }

  return tx.inventoryItem.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletId,
      productId: params.productId,
      stockOnHand: new Prisma.Decimal(0),
    },
  });
}

async function applyInventoryInForGoodsReceiptItem(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    businessUserId: string;
    goodsReceiptId: string;
    goodsReceiptNumber: string;
    productId: string;
    quantityAccepted: Prisma.Decimal;
    note: string | null;
  },
) {
  const inventoryItem = await ensureInventoryItemTx(tx, {
    businessId: params.businessId,
    outletId: params.outletId,
    productId: params.productId,
  });

  const current = await tx.inventoryItem.findUniqueOrThrow({
    where: {
      id: inventoryItem.id,
    },
  });

  const nextStock = current.stockOnHand.plus(params.quantityAccepted);

  await tx.inventoryItem.update({
    where: {
      id: inventoryItem.id,
    },
    data: {
      stockOnHand: nextStock,
      lastMovementAt: new Date(),
    },
  });

  await tx.inventoryMovement.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletId,
      productId: params.productId,
      inventoryItemId: inventoryItem.id,
      type: InventoryMovementType.IN,
      quantity: params.quantityAccepted,
      note: params.note ?? `Goods receipt ${params.goodsReceiptNumber}`,
      referenceType: 'GOODS_RECEIPT',
      referenceId: params.goodsReceiptId,
      createdByBusinessUserId: params.businessUserId,
    },
  });
}

async function createPurchasePriceHistoryForGoodsReceipt(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    supplierId: string;
    goodsReceiptId: string;
    purchaseOrderId: string | null;
    effectiveDate: Date;
    items: Array<{
      id: string;
      purchaseOrderItemId: string | null;
      productId: string;
      quantityAccepted: Prisma.Decimal;
      unitCost: Prisma.Decimal;
    }>;
  },
) {
  if (params.items.length === 0) {
    return;
  }

  await tx.purchasePriceHistory.createMany({
    data: params.items.map((item) => ({
      businessId: params.businessId,
      outletId: params.outletId,
      supplierId: params.supplierId,
      productId: item.productId,
      goodsReceiptId: params.goodsReceiptId,
      goodsReceiptItemId: item.id,
      purchaseOrderId: params.purchaseOrderId,
      purchaseOrderItemId: item.purchaseOrderItemId,
      effectiveDate: params.effectiveDate,
      quantity: item.quantityAccepted,
      unitCost: item.unitCost,
    })),
  });
}

async function recalculatePurchaseOrderStatus(
  tx: Prisma.TransactionClient,
  purchaseOrderId: string,
) {
  const purchaseOrderItems = await tx.purchaseOrderItem.findMany({
    where: {
      purchaseOrderId,
    },
    select: {
      id: true,
      quantityOrdered: true,
      quantityReceived: true,
    },
  });

  const allReceived = purchaseOrderItems.every((item) =>
    item.quantityReceived.greaterThanOrEqualTo(item.quantityOrdered),
  );
  const anyReceived = purchaseOrderItems.some((item) =>
    item.quantityReceived.greaterThan(new Prisma.Decimal(0)),
  );

  const nextStatus = allReceived
    ? PurchaseOrderStatus.RECEIVED
    : anyReceived
      ? PurchaseOrderStatus.PARTIALLY_RECEIVED
      : PurchaseOrderStatus.SUBMITTED;

  await tx.purchaseOrder.update({
    where: {
      id: purchaseOrderId,
    },
    data: {
      status: nextStatus,
    },
  });
}

export async function listGoodsReceipts(input: ListGoodsReceiptsInput) {
  const search = normalizeSearch(input.search);

  const where: Prisma.GoodsReceiptWhereInput = {
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
    ...(input.purchaseOrderId
      ? {
          purchaseOrderId: input.purchaseOrderId,
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              receiptNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              supplierInvoiceNumber: {
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
            {
              purchaseOrder: {
                poNumber: {
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
    prisma.goodsReceipt.count({ where }),
    prisma.goodsReceipt.findMany({
      where,
      include: {
        supplier: {
          select: {
            code: true,
            name: true,
          },
        },
        purchaseOrder: {
          select: {
            poNumber: true,
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
          receiptDate: 'desc',
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
    items: rows.map(mapGoodsReceiptSummary),
    meta: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}

export async function getGoodsReceiptById(params: {
  businessId: string;
  outletId: string;
  goodsReceiptId: string;
}) {
  return getGoodsReceiptByIdInternal(prisma, params);
}

export async function createGoodsReceipt(input: CreateGoodsReceiptInput) {
  return prisma.$transaction(async (tx) => {
    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);
    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.businessUserId,
    );
    await ensureSupplierBelongsToBusiness(tx, input.businessId, input.supplierId);

    if (input.purchaseOrderId) {
      await ensurePurchaseOrderForReceipt(tx, {
        businessId: input.businessId,
        outletId: input.outletId,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
      });
    }

    const builtItems = await buildGoodsReceiptItems(tx, {
      businessId: input.businessId,
      purchaseOrderId: input.purchaseOrderId,
      items: input.items,
    });
    const receiptNumber = await generateGoodsReceiptNumber(tx, input.receiptDate);

    const goodsReceipt = await tx.goodsReceipt.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
        createdByBusinessUserId: input.businessUserId,
        receiptNumber,
        receiptDate: input.receiptDate,
        supplierInvoiceNumber: normalizeNullableText(input.supplierInvoiceNumber),
        notes: normalizeNullableText(input.notes),
        status: GoodsReceiptStatus.DRAFT,
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

    return getGoodsReceiptByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: goodsReceipt.id,
    });
  });
}

export async function updateGoodsReceipt(input: UpdateGoodsReceiptInput) {
  return prisma.$transaction(async (tx) => {
    const goodsReceipt = await ensureGoodsReceiptExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: input.goodsReceiptId,
    });

    validateGoodsReceiptEditable(goodsReceipt.status);

    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);
    await ensureSupplierBelongsToBusiness(tx, input.businessId, input.supplierId);

    if (input.purchaseOrderId) {
      await ensurePurchaseOrderForReceipt(tx, {
        businessId: input.businessId,
        outletId: input.outletId,
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
      });
    }

    const builtItems = await buildGoodsReceiptItems(tx, {
      businessId: input.businessId,
      purchaseOrderId: input.purchaseOrderId,
      items: input.items,
    });

    await tx.goodsReceipt.update({
      where: {
        id: input.goodsReceiptId,
      },
      data: {
        supplierId: input.supplierId,
        purchaseOrderId: input.purchaseOrderId,
        receiptDate: input.receiptDate,
        supplierInvoiceNumber: normalizeNullableText(input.supplierInvoiceNumber),
        notes: normalizeNullableText(input.notes),
        subtotal: builtItems.subtotal,
        totalAmount: builtItems.totalAmount,
        items: {
          deleteMany: {},
          create: builtItems.rows,
        },
      },
    });

    return getGoodsReceiptByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: input.goodsReceiptId,
    });
  });
}

export async function postGoodsReceipt(input: GoodsReceiptPostInput) {
  return prisma.$transaction(async (tx) => {
    const goodsReceipt = await tx.goodsReceipt.findFirst({
      where: {
        id: input.goodsReceiptId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      include: {
        items: true,
      },
    });

    if (!goodsReceipt) {
      throw createHttpError('Goods receipt tidak ditemukan.', 404);
    }

    validateGoodsReceiptEditable(goodsReceipt.status);

    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.postedByBusinessUserId,
    );

    const purchaseOrderItems = goodsReceipt.purchaseOrderId
      ? await tx.purchaseOrderItem.findMany({
          where: {
            purchaseOrderId: goodsReceipt.purchaseOrderId,
          },
          select: {
            id: true,
            quantityOrdered: true,
            quantityReceived: true,
          },
        })
      : [];

    const purchaseOrderItemMap = new Map(
      purchaseOrderItems.map((item) => [item.id, item]),
    );

    for (const item of goodsReceipt.items) {
      if (item.purchaseOrderItemId) {
        const purchaseOrderItem = purchaseOrderItemMap.get(item.purchaseOrderItemId);

        if (!purchaseOrderItem) {
          throw createHttpError(
            `Item purchase order untuk product ${item.productName} tidak ditemukan.`,
            404,
          );
        }

        const remaining = purchaseOrderItem.quantityOrdered.minus(
          purchaseOrderItem.quantityReceived,
        );

        if (item.quantityAccepted.greaterThan(remaining)) {
          throw createHttpError(
            `Quantity goods receipt untuk product ${item.productName} melebihi sisa quantity purchase order.`,
            400,
          );
        }
      }
    }

    for (const item of goodsReceipt.items) {
      await applyInventoryInForGoodsReceiptItem(tx, {
        businessId: goodsReceipt.businessId,
        outletId: goodsReceipt.outletId,
        businessUserId: input.postedByBusinessUserId,
        goodsReceiptId: goodsReceipt.id,
        goodsReceiptNumber: goodsReceipt.receiptNumber,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        note: item.note,
      });

      if (item.purchaseOrderItemId) {
        await tx.purchaseOrderItem.update({
          where: {
            id: item.purchaseOrderItemId,
          },
          data: {
            quantityReceived: {
              increment: item.quantityAccepted,
            },
          },
        });
      }
    }

    if (goodsReceipt.purchaseOrderId) {
      await recalculatePurchaseOrderStatus(tx, goodsReceipt.purchaseOrderId);
    }

    await createPurchasePriceHistoryForGoodsReceipt(tx, {
      businessId: goodsReceipt.businessId,
      outletId: goodsReceipt.outletId,
      supplierId: goodsReceipt.supplierId,
      goodsReceiptId: goodsReceipt.id,
      purchaseOrderId: goodsReceipt.purchaseOrderId,
      effectiveDate: goodsReceipt.receiptDate,
      items: goodsReceipt.items.map((item) => ({
        id: item.id,
        purchaseOrderItemId: item.purchaseOrderItemId,
        productId: item.productId,
        quantityAccepted: item.quantityAccepted,
        unitCost: item.unitCost,
      })),
    });

    await tx.goodsReceipt.update({
      where: {
        id: goodsReceipt.id,
      },
      data: {
        status: GoodsReceiptStatus.POSTED,
        postedByBusinessUserId: input.postedByBusinessUserId,
        postedAt: new Date(),
      },
    });

    await ensureAutoSupplierInvoiceForPostedGoodsReceiptTx(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: goodsReceipt.id,
      businessUserId: input.postedByBusinessUserId,
    });

    return getGoodsReceiptByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: goodsReceipt.id,
    });
  });
}

export async function voidGoodsReceipt(input: GoodsReceiptVoidInput) {
  return prisma.$transaction(async (tx) => {
    const goodsReceipt = await ensureGoodsReceiptExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: input.goodsReceiptId,
    });

    validateGoodsReceiptEditable(goodsReceipt.status);

    await tx.goodsReceipt.update({
      where: {
        id: input.goodsReceiptId,
      },
      data: {
        status: GoodsReceiptStatus.VOID,
        voidedAt: new Date(),
      },
    });

    return getGoodsReceiptByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: input.goodsReceiptId,
    });
  });
}

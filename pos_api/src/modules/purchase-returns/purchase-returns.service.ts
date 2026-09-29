import {
  GoodsReceiptStatus,
  InventoryMovementType,
  Prisma,
  PurchaseReturnStatus,
  SupplierInvoiceStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { issueSupplierCreditForOverpaymentTx } from '../supplier-credits/supplier-credits.service';
import type {
  CreatePurchaseReturnInput,
  ListPurchaseReturnsInput,
  PostPurchaseReturnInput,
  PurchaseReturnDetailDto,
  PurchaseReturnItemPayload,
  PurchaseReturnSummaryDto,
  UpdatePurchaseReturnInput,
  VoidPurchaseReturnInput,
} from './purchase-returns.types';

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

function buildPurchaseReturnNumberPrefix(date = new Date()): string {
  const year = date.getFullYear().toString();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `PR-${year}${month}${day}`;
}

async function generatePurchaseReturnNumber(
  tx: Prisma.TransactionClient,
  returnDate: Date,
): Promise<string> {
  const prefix = buildPurchaseReturnNumberPrefix(returnDate);
  const latestPurchaseReturn = await tx.purchaseReturn.findFirst({
    where: {
      returnNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      returnNumber: 'desc',
    },
    select: {
      returnNumber: true,
    },
  });

  const latestSequence = latestPurchaseReturn?.returnNumber
    ? Number(latestPurchaseReturn.returnNumber.split('-').pop() ?? '0')
    : 0;

  return `${prefix}-${`${latestSequence + 1}`.padStart(4, '0')}`;
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

async function ensureGoodsReceiptForReturn(
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
    include: {
      supplier: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      supplierInvoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          grandTotal: true,
          paidAmount: true,
          outstandingAmount: true,
          _count: {
            select: {
              payments: true,
            },
          },
        },
      },
      items: {
        select: {
          id: true,
          productId: true,
          productName: true,
          productCode: true,
          productSku: true,
          productBarcode: true,
          unit: true,
          quantityAccepted: true,
          quantityReturned: true,
          unitCost: true,
        },
      },
    },
  });

  if (!goodsReceipt) {
    throw createHttpError('Goods receipt tidak ditemukan.', 404);
  }

  if (goodsReceipt.status !== GoodsReceiptStatus.POSTED) {
    throw createHttpError(
      'Retur pembelian hanya bisa dibuat dari goods receipt yang sudah diposting.',
      400,
    );
  }

  return goodsReceipt;
}

type PurchaseReturnReader = Prisma.TransactionClient | typeof prisma;

async function getPurchaseReturnByIdInternal(
  db: PurchaseReturnReader,
  params: {
    businessId: string;
    outletId: string;
    purchaseReturnId: string;
  },
): Promise<PurchaseReturnDetailDto> {
  const purchaseReturn = await db.purchaseReturn.findFirst({
    where: {
      id: params.purchaseReturnId,
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
      goodsReceipt: {
        select: {
          id: true,
          receiptNumber: true,
        },
      },
      supplierInvoice: {
        select: {
          id: true,
          invoiceNumber: true,
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

  if (!purchaseReturn) {
    throw createHttpError('Purchase return tidak ditemukan.', 404);
  }

  return {
    id: purchaseReturn.id,
    businessId: purchaseReturn.businessId,
    outletId: purchaseReturn.outletId,
    supplierId: purchaseReturn.supplierId,
    goodsReceiptId: purchaseReturn.goodsReceiptId,
    supplierInvoiceId: purchaseReturn.supplierInvoiceId,
    supplierName: purchaseReturn.supplier.name,
    supplierCode: purchaseReturn.supplier.code,
    goodsReceiptNumber: purchaseReturn.goodsReceipt.receiptNumber,
    supplierInvoiceNumber: purchaseReturn.supplierInvoice?.invoiceNumber ?? null,
    returnNumber: purchaseReturn.returnNumber,
    returnDate: purchaseReturn.returnDate.toISOString(),
    reason: purchaseReturn.reason,
    notes: purchaseReturn.notes,
    status: purchaseReturn.status,
    subtotal: toMoneyString(purchaseReturn.subtotal),
    totalAmount: toMoneyString(purchaseReturn.totalAmount),
    postedAt: purchaseReturn.postedAt ? purchaseReturn.postedAt.toISOString() : null,
    voidedAt: purchaseReturn.voidedAt ? purchaseReturn.voidedAt.toISOString() : null,
    createdAt: purchaseReturn.createdAt.toISOString(),
    updatedAt: purchaseReturn.updatedAt.toISOString(),
    itemCount: purchaseReturn._count.items,
    outletName: purchaseReturn.outlet.name,
    createdByBusinessUserId: purchaseReturn.createdByBusinessUserId,
    postedByBusinessUserId: purchaseReturn.postedByBusinessUserId,
    items: purchaseReturn.items.map((item) => ({
      id: item.id,
      goodsReceiptItemId: item.goodsReceiptItemId,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      productSku: item.productSku,
      productBarcode: item.productBarcode,
      unit: item.unit,
      quantityReturned: toQuantityString(item.quantityReturned),
      unitCost: toMoneyString(item.unitCost),
      lineSubtotal: toMoneyString(item.lineSubtotal),
      note: item.note,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
    })),
  };
}

async function ensurePurchaseReturnExists(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    purchaseReturnId: string;
  },
) {
  const purchaseReturn = await tx.purchaseReturn.findFirst({
    where: {
      id: params.purchaseReturnId,
      businessId: params.businessId,
      outletId: params.outletId,
    },
    select: {
      id: true,
      goodsReceiptId: true,
      supplierInvoiceId: true,
      status: true,
    },
  });

  if (!purchaseReturn) {
    throw createHttpError('Purchase return tidak ditemukan.', 404);
  }

  return purchaseReturn;
}

function validatePurchaseReturnEditable(status: PurchaseReturnStatus) {
  if (status !== PurchaseReturnStatus.DRAFT) {
    throw createHttpError('Hanya purchase return draft yang bisa diubah.', 400);
  }
}

async function buildPurchaseReturnItems(
  tx: Prisma.TransactionClient,
  params: {
    goodsReceiptId: string;
    items: PurchaseReturnItemPayload[];
  },
) {
  const seenGoodsReceiptItemIds = new Set<string>();

  for (const item of params.items) {
    if (seenGoodsReceiptItemIds.has(item.goodsReceiptItemId)) {
      throw createHttpError(
        'Item goods receipt pada purchase return tidak boleh duplikat.',
        400,
      );
    }

    seenGoodsReceiptItemIds.add(item.goodsReceiptItemId);
  }

  const goodsReceiptItems = await tx.goodsReceiptItem.findMany({
    where: {
      goodsReceiptId: params.goodsReceiptId,
      id: {
        in: params.items.map((item) => item.goodsReceiptItemId),
      },
    },
    select: {
      id: true,
      productId: true,
      productName: true,
      productCode: true,
      productSku: true,
      productBarcode: true,
      unit: true,
      quantityAccepted: true,
      quantityReturned: true,
      unitCost: true,
    },
  });

  if (goodsReceiptItems.length !== params.items.length) {
    throw createHttpError(
      'Ada item purchase return yang tidak ditemukan pada goods receipt terkait.',
      404,
    );
  }

  const goodsReceiptItemMap = new Map(
    goodsReceiptItems.map((item) => [item.id, item]),
  );

  const rows = params.items.map((item) => {
    const goodsReceiptItem = goodsReceiptItemMap.get(item.goodsReceiptItemId);

    if (!goodsReceiptItem) {
      throw createHttpError('Item goods receipt tidak ditemukan.', 404);
    }

    const quantityReturned = new Prisma.Decimal(item.quantityReturned);
    const remainingReturnable = goodsReceiptItem.quantityAccepted.minus(
      goodsReceiptItem.quantityReturned,
    );

    if (quantityReturned.greaterThan(remainingReturnable)) {
      throw createHttpError(
        `Quantity retur untuk product ${goodsReceiptItem.productName} melebihi sisa yang bisa diretur.`,
        400,
      );
    }

    const lineSubtotal = quantityReturned.mul(goodsReceiptItem.unitCost);

    return {
      goodsReceiptItemId: goodsReceiptItem.id,
      productId: goodsReceiptItem.productId,
      productName: goodsReceiptItem.productName,
      productCode: goodsReceiptItem.productCode,
      productSku: goodsReceiptItem.productSku,
      productBarcode: goodsReceiptItem.productBarcode,
      unit: goodsReceiptItem.unit,
      quantityReturned,
      unitCost: goodsReceiptItem.unitCost,
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

function mapPurchaseReturnSummary(purchaseReturn: {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  goodsReceiptId: string;
  supplierInvoiceId: string | null;
  returnNumber: string;
  returnDate: Date;
  reason: string | null;
  notes: string | null;
  status: PurchaseReturnStatus;
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
  goodsReceipt: {
    receiptNumber: string;
  };
  supplierInvoice: {
    invoiceNumber: string;
  } | null;
  _count: {
    items: number;
  };
}): PurchaseReturnSummaryDto {
  return {
    id: purchaseReturn.id,
    businessId: purchaseReturn.businessId,
    outletId: purchaseReturn.outletId,
    supplierId: purchaseReturn.supplierId,
    goodsReceiptId: purchaseReturn.goodsReceiptId,
    supplierInvoiceId: purchaseReturn.supplierInvoiceId,
    supplierName: purchaseReturn.supplier.name,
    supplierCode: purchaseReturn.supplier.code,
    goodsReceiptNumber: purchaseReturn.goodsReceipt.receiptNumber,
    supplierInvoiceNumber: purchaseReturn.supplierInvoice?.invoiceNumber ?? null,
    returnNumber: purchaseReturn.returnNumber,
    returnDate: purchaseReturn.returnDate.toISOString(),
    reason: purchaseReturn.reason,
    notes: purchaseReturn.notes,
    status: purchaseReturn.status,
    subtotal: toMoneyString(purchaseReturn.subtotal),
    totalAmount: toMoneyString(purchaseReturn.totalAmount),
    postedAt: purchaseReturn.postedAt ? purchaseReturn.postedAt.toISOString() : null,
    voidedAt: purchaseReturn.voidedAt ? purchaseReturn.voidedAt.toISOString() : null,
    createdAt: purchaseReturn.createdAt.toISOString(),
    updatedAt: purchaseReturn.updatedAt.toISOString(),
    itemCount: purchaseReturn._count.items,
  };
}

async function ensureInventoryItemForReturn(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    productId: string;
  },
) {
  const inventoryItem = await tx.inventoryItem.findFirst({
    where: {
      businessId: params.businessId,
      outletId: params.outletId,
      productId: params.productId,
    },
  });

  if (!inventoryItem) {
    throw createHttpError(
      'Inventory item untuk product retur tidak ditemukan pada outlet ini.',
      404,
    );
  }

  return inventoryItem;
}

async function applyInventoryOutForPurchaseReturnItem(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    businessUserId: string;
    purchaseReturnId: string;
    purchaseReturnNumber: string;
    productId: string;
    quantityReturned: Prisma.Decimal;
    note: string | null;
  },
) {
  const inventoryItem = await ensureInventoryItemForReturn(tx, {
    businessId: params.businessId,
    outletId: params.outletId,
    productId: params.productId,
  });

  if (inventoryItem.stockOnHand.lessThan(params.quantityReturned)) {
    throw createHttpError(
      `Stok product retur tidak cukup untuk diproses pada outlet ini.`,
      400,
    );
  }

  const nextStock = inventoryItem.stockOnHand.minus(params.quantityReturned);

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
      type: InventoryMovementType.OUT,
      quantity: params.quantityReturned,
      note: params.note ?? `Purchase return ${params.purchaseReturnNumber}`,
      referenceType: 'PURCHASE_RETURN',
      referenceId: params.purchaseReturnId,
      createdByBusinessUserId: params.businessUserId,
    },
  });
}

/**
 * Reduce supplier debt (hutang) for a posted purchase return.
 *
 * - The invoice is taken from the return, or looked up by goods receipt when
 *   the return was drafted before the invoice existed.
 * - Applies whether or not the invoice already has payments: grandTotal drops
 *   by the return value and outstanding = grandTotal - paidAmount (never < 0).
 * - Money already paid above the new grandTotal becomes supplier credit
 *   (refundable or usable on a later invoice of the same supplier).
 * - Returns the linked invoice id (or null when there is no active invoice).
 */
async function adjustLinkedSupplierInvoiceForPurchaseReturn(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    goodsReceiptId: string;
    supplierInvoiceId: string | null;
    purchaseReturnId: string;
    purchaseReturnNumber: string;
    businessUserId: string;
    returnTotal: Prisma.Decimal;
  },
): Promise<string | null> {
  const invoice = await tx.supplierInvoice.findFirst({
    where: params.supplierInvoiceId
      ? {
          id: params.supplierInvoiceId,
          businessId: params.businessId,
        }
      : {
          businessId: params.businessId,
          goodsReceiptId: params.goodsReceiptId,
        },
    select: {
      id: true,
      outletId: true,
      supplierId: true,
      invoiceNumber: true,
      status: true,
      grandTotal: true,
      paidAmount: true,
    },
  });

  if (!invoice || invoice.status === SupplierInvoiceStatus.VOID) {
    return null;
  }

  const zero = new Prisma.Decimal(0);
  const nextGrandTotal = invoice.grandTotal.minus(params.returnTotal);

  if (nextGrandTotal.lessThan(zero)) {
    throw createHttpError(
      'Nilai retur melebihi grand total invoice supplier terkait.',
      400,
    );
  }

  const remaining = nextGrandTotal.minus(invoice.paidAmount);
  const nextOutstanding = remaining.lessThan(zero) ? zero : remaining;
  const hasPayment = invoice.paidAmount.greaterThan(zero);

  let nextStatus: SupplierInvoiceStatus;

  if (nextGrandTotal.lessThanOrEqualTo(zero) && !hasPayment) {
    nextStatus = SupplierInvoiceStatus.VOID;
  } else if (nextOutstanding.lessThanOrEqualTo(zero)) {
    nextStatus = SupplierInvoiceStatus.PAID;
  } else if (hasPayment) {
    nextStatus = SupplierInvoiceStatus.PARTIALLY_PAID;
  } else {
    nextStatus = SupplierInvoiceStatus.UNPAID;
  }

  await tx.supplierInvoice.update({
    where: {
      id: invoice.id,
    },
    data: {
      grandTotal: nextGrandTotal,
      outstandingAmount: nextOutstanding,
      status: nextStatus,
    },
  });

  // Only the overpayment caused by this return is new credit; overpayment that
  // existed before (from an earlier return) was already credited.
  const previousOverpayment = invoice.paidAmount.minus(invoice.grandTotal);
  const nextOverpayment = invoice.paidAmount.minus(nextGrandTotal);
  const newCredit = nextOverpayment.minus(
    previousOverpayment.greaterThan(zero) ? previousOverpayment : zero,
  );

  if (newCredit.greaterThan(zero)) {
    await issueSupplierCreditForOverpaymentTx(tx, {
      businessId: params.businessId,
      outletId: invoice.outletId,
      supplierId: invoice.supplierId,
      sourceSupplierInvoiceId: invoice.id,
      purchaseReturnId: params.purchaseReturnId,
      createdByBusinessUserId: params.businessUserId,
      amount: newCredit.toFixed(2),
      notes: `Kelebihan bayar invoice ${invoice.invoiceNumber} karena retur ${params.purchaseReturnNumber}`,
    });
  }

  return invoice.id;
}

export async function listPurchaseReturns(input: ListPurchaseReturnsInput) {
  const search = normalizeSearch(input.search);

  const where: Prisma.PurchaseReturnWhereInput = {
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
    ...(input.goodsReceiptId
      ? {
          goodsReceiptId: input.goodsReceiptId,
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              returnNumber: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              reason: {
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
              goodsReceipt: {
                receiptNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              supplierInvoice: {
                invoiceNumber: {
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
    prisma.purchaseReturn.count({ where }),
    prisma.purchaseReturn.findMany({
      where,
      include: {
        supplier: {
          select: {
            code: true,
            name: true,
          },
        },
        goodsReceipt: {
          select: {
            receiptNumber: true,
          },
        },
        supplierInvoice: {
          select: {
            invoiceNumber: true,
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
          returnDate: 'desc',
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
    items: rows.map(mapPurchaseReturnSummary),
    meta: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}

export async function getPurchaseReturnById(params: {
  businessId: string;
  outletId: string;
  purchaseReturnId: string;
}) {
  return getPurchaseReturnByIdInternal(prisma, params);
}

export async function createPurchaseReturn(input: CreatePurchaseReturnInput) {
  return prisma.$transaction(async (tx) => {
    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);
    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.businessUserId,
    );

    const goodsReceipt = await ensureGoodsReceiptForReturn(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: input.goodsReceiptId,
    });

    const builtItems = await buildPurchaseReturnItems(tx, {
      goodsReceiptId: input.goodsReceiptId,
      items: input.items,
    });
    const returnNumber = await generatePurchaseReturnNumber(tx, input.returnDate);

    const purchaseReturn = await tx.purchaseReturn.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        supplierId: goodsReceipt.supplierId,
        goodsReceiptId: goodsReceipt.id,
        supplierInvoiceId: goodsReceipt.supplierInvoice?.id ?? null,
        createdByBusinessUserId: input.businessUserId,
        returnNumber,
        returnDate: input.returnDate,
        reason: normalizeNullableText(input.reason),
        notes: normalizeNullableText(input.notes),
        status: PurchaseReturnStatus.DRAFT,
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

    return getPurchaseReturnByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseReturnId: purchaseReturn.id,
    });
  });
}

export async function updatePurchaseReturn(input: UpdatePurchaseReturnInput) {
  return prisma.$transaction(async (tx) => {
    const purchaseReturn = await ensurePurchaseReturnExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseReturnId: input.purchaseReturnId,
    });

    validatePurchaseReturnEditable(purchaseReturn.status);

    await ensureOutletBelongsToBusiness(tx, input.businessId, input.outletId);

    const goodsReceipt = await ensureGoodsReceiptForReturn(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      goodsReceiptId: input.goodsReceiptId,
    });

    const builtItems = await buildPurchaseReturnItems(tx, {
      goodsReceiptId: input.goodsReceiptId,
      items: input.items,
    });

    await tx.purchaseReturn.update({
      where: {
        id: input.purchaseReturnId,
      },
      data: {
        supplierId: goodsReceipt.supplierId,
        goodsReceiptId: goodsReceipt.id,
        supplierInvoiceId: goodsReceipt.supplierInvoice?.id ?? null,
        returnDate: input.returnDate,
        reason: normalizeNullableText(input.reason),
        notes: normalizeNullableText(input.notes),
        subtotal: builtItems.subtotal,
        totalAmount: builtItems.totalAmount,
        items: {
          deleteMany: {},
          create: builtItems.rows,
        },
      },
    });

    return getPurchaseReturnByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseReturnId: input.purchaseReturnId,
    });
  });
}

export async function postPurchaseReturn(input: PostPurchaseReturnInput) {
  return prisma.$transaction(async (tx) => {
    const purchaseReturn = await tx.purchaseReturn.findFirst({
      where: {
        id: input.purchaseReturnId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      include: {
        items: true,
      },
    });

    if (!purchaseReturn) {
      throw createHttpError('Purchase return tidak ditemukan.', 404);
    }

    validatePurchaseReturnEditable(purchaseReturn.status);

    await ensureBusinessUserBelongsToBusiness(
      tx,
      input.businessId,
      input.postedByBusinessUserId,
    );

    const goodsReceiptItems = await tx.goodsReceiptItem.findMany({
      where: {
        goodsReceiptId: purchaseReturn.goodsReceiptId,
        id: {
          in: purchaseReturn.items.map((item) => item.goodsReceiptItemId),
        },
      },
      select: {
        id: true,
        productName: true,
        quantityAccepted: true,
        quantityReturned: true,
      },
    });

    const goodsReceiptItemMap = new Map(
      goodsReceiptItems.map((item) => [item.id, item]),
    );

    for (const item of purchaseReturn.items) {
      const goodsReceiptItem = goodsReceiptItemMap.get(item.goodsReceiptItemId);

      if (!goodsReceiptItem) {
        throw createHttpError(
          `Item goods receipt untuk product ${item.productName} tidak ditemukan.`,
          404,
        );
      }

      const remainingReturnable = goodsReceiptItem.quantityAccepted.minus(
        goodsReceiptItem.quantityReturned,
      );

      if (item.quantityReturned.greaterThan(remainingReturnable)) {
        throw createHttpError(
          `Quantity retur untuk product ${goodsReceiptItem.productName} melebihi sisa yang bisa diretur.`,
          400,
        );
      }
    }

    for (const item of purchaseReturn.items) {
      await applyInventoryOutForPurchaseReturnItem(tx, {
        businessId: purchaseReturn.businessId,
        outletId: purchaseReturn.outletId,
        businessUserId: input.postedByBusinessUserId,
        purchaseReturnId: purchaseReturn.id,
        purchaseReturnNumber: purchaseReturn.returnNumber,
        productId: item.productId,
        quantityReturned: item.quantityReturned,
        note: item.note,
      });

      await tx.goodsReceiptItem.update({
        where: {
          id: item.goodsReceiptItemId,
        },
        data: {
          quantityReturned: {
            increment: item.quantityReturned,
          },
        },
      });
    }

    const linkedSupplierInvoiceId = await adjustLinkedSupplierInvoiceForPurchaseReturn(tx, {
      businessId: purchaseReturn.businessId,
      goodsReceiptId: purchaseReturn.goodsReceiptId,
      supplierInvoiceId: purchaseReturn.supplierInvoiceId,
      purchaseReturnId: purchaseReturn.id,
      purchaseReturnNumber: purchaseReturn.returnNumber,
      businessUserId: input.postedByBusinessUserId,
      returnTotal: purchaseReturn.totalAmount,
    });

    await tx.purchaseReturn.update({
      where: {
        id: purchaseReturn.id,
      },
      data: {
        supplierInvoiceId: linkedSupplierInvoiceId ?? purchaseReturn.supplierInvoiceId,
        status: PurchaseReturnStatus.POSTED,
        postedByBusinessUserId: input.postedByBusinessUserId,
        postedAt: new Date(),
      },
    });

    return getPurchaseReturnByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseReturnId: purchaseReturn.id,
    });
  });
}

export async function voidPurchaseReturn(input: VoidPurchaseReturnInput) {
  return prisma.$transaction(async (tx) => {
    const purchaseReturn = await ensurePurchaseReturnExists(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseReturnId: input.purchaseReturnId,
    });

    validatePurchaseReturnEditable(purchaseReturn.status);

    await tx.purchaseReturn.update({
      where: {
        id: input.purchaseReturnId,
      },
      data: {
        status: PurchaseReturnStatus.VOID,
        voidedAt: new Date(),
      },
    });

    return getPurchaseReturnByIdInternal(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      purchaseReturnId: input.purchaseReturnId,
    });
  });
}

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  ListPurchasePriceHistoryInput,
  PurchasePriceHistoryItemDto,
} from './purchase-price-history.types';

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

function buildDateRange(dateFrom?: Date, dateTo?: Date) {
  if (!dateFrom && !dateTo) {
    return undefined;
  }

  const range: Prisma.DateTimeFilter = {};

  if (dateFrom) {
    const start = new Date(dateFrom);
    start.setHours(0, 0, 0, 0);
    range.gte = start;
  }

  if (dateTo) {
    const end = new Date(dateTo);
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }

  return range;
}

function mapPurchasePriceHistoryItem(item: {
  id: string;
  businessId: string;
  outletId: string;
  supplierId: string;
  productId: string;
  goodsReceiptId: string;
  goodsReceiptItemId: string;
  purchaseOrderId: string | null;
  purchaseOrderItemId: string | null;
  effectiveDate: Date;
  quantity: Prisma.Decimal;
  unitCost: Prisma.Decimal;
  createdAt: Date;
  outlet: {
    name: string;
  };
  supplier: {
    name: string;
    code: string;
  };
  goodsReceipt: {
    receiptNumber: string;
    supplierInvoiceNumber: string | null;
  };
  goodsReceiptItem: {
    productName: string;
    productCode: string | null;
    productSku: string | null;
    productBarcode: string | null;
    unit: string | null;
  };
}): PurchasePriceHistoryItemDto {
  return {
    id: item.id,
    businessId: item.businessId,
    outletId: item.outletId,
    outletName: item.outlet.name,
    supplierId: item.supplierId,
    supplierName: item.supplier.name,
    supplierCode: item.supplier.code,
    productId: item.productId,
    productName: item.goodsReceiptItem.productName,
    productCode: item.goodsReceiptItem.productCode,
    productSku: item.goodsReceiptItem.productSku,
    productBarcode: item.goodsReceiptItem.productBarcode,
    unit: item.goodsReceiptItem.unit,
    goodsReceiptId: item.goodsReceiptId,
    goodsReceiptItemId: item.goodsReceiptItemId,
    purchaseOrderId: item.purchaseOrderId,
    purchaseOrderItemId: item.purchaseOrderItemId,
    receiptNumber: item.goodsReceipt.receiptNumber,
    supplierInvoiceNumber: item.goodsReceipt.supplierInvoiceNumber,
    effectiveDate: item.effectiveDate.toISOString(),
    quantity: toQuantityString(item.quantity),
    unitCost: toMoneyString(item.unitCost),
    createdAt: item.createdAt.toISOString(),
  };
}

export async function listPurchasePriceHistory(
  input: ListPurchasePriceHistoryInput,
) {
  const search = normalizeSearch(input.search);
  const effectiveDate = buildDateRange(input.dateFrom, input.dateTo);

  const where: Prisma.PurchasePriceHistoryWhereInput = {
    businessId: input.businessId,
    outletId: input.outletId,
    ...(input.supplierId
      ? {
          supplierId: input.supplierId,
        }
      : {}),
    ...(input.productId
      ? {
          productId: input.productId,
        }
      : {}),
    ...(effectiveDate
      ? {
          effectiveDate,
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              goodsReceipt: {
                receiptNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              goodsReceipt: {
                supplierInvoiceNumber: {
                  contains: search,
                  mode: 'insensitive',
                },
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
              goodsReceiptItem: {
                productName: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              goodsReceiptItem: {
                productCode: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              goodsReceiptItem: {
                productSku: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              goodsReceiptItem: {
                productBarcode: {
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
    prisma.purchasePriceHistory.count({ where }),
    prisma.purchasePriceHistory.findMany({
      where,
      include: {
        outlet: {
          select: {
            name: true,
          },
        },
        supplier: {
          select: {
            name: true,
            code: true,
          },
        },
        goodsReceipt: {
          select: {
            receiptNumber: true,
            supplierInvoiceNumber: true,
          },
        },
        goodsReceiptItem: {
          select: {
            productName: true,
            productCode: true,
            productSku: true,
            productBarcode: true,
            unit: true,
          },
        },
      },
      orderBy: [
        {
          effectiveDate: 'desc',
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
    items: rows.map(mapPurchasePriceHistoryItem),
    meta: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}

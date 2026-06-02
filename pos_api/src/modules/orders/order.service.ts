import { applyChargesAndRounding, getOutletPosChargeSettings } from '../pos-settings/pos-settings.service';
import {
  BusinessType,
  OrderStatus,
  OrderType,
  PaymentStatus,
  Prisma,
  ProductOutletStatus,
  PromoDiscountType,
  PromoOutletScope,
  PromoStatus,
  PromoTargetType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { enforceMonthlyTransactionLimit } from '../../middlewares/subscription-limit.middleware';
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

function isGuestOrderNumber(orderNumber: string): boolean {
  return orderNumber.startsWith('GUEST-');
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

function getJakartaNowParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());

  const year = parts.find((item) => item.type === 'year')?.value ?? '0000';
  const month = parts.find((item) => item.type === 'month')?.value ?? '00';
  const day = parts.find((item) => item.type === 'day')?.value ?? '00';
  const hour = parts.find((item) => item.type === 'hour')?.value ?? '00';
  const minute = parts.find((item) => item.type === 'minute')?.value ?? '00';

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function normalizeComparableText(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

function isPromoActiveNow(promo: {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  status: PromoStatus;
}) {
  if (promo.status !== PromoStatus.ACTIVE) {
    return false;
  }

  const now = getJakartaNowParts();
  const startDate = formatDateOnly(promo.startDate);
  const endDate = formatDateOnly(promo.endDate);

  if (now.date < startDate) {
    return false;
  }

  if (now.date > endDate) {
    return false;
  }

  if (now.date === startDate && now.time < promo.startTime) {
    return false;
  }

  if (now.date === endDate && now.time > promo.endTime) {
    return false;
  }

  return true;
}

function isPromoMatchingProductData(
  promo: {
    targetType: PromoTargetType;
    categoryId: string | null;
    productId: string | null;
    targetTextValue: string | null;
  },
  product: {
    id: string;
    categoryId: string | null;
    name: string;
    brand: string | null;
    unit: string | null;
  },
): boolean {
  if (promo.targetType === PromoTargetType.CATEGORY) {
    return promo.categoryId !== null && promo.categoryId === product.categoryId;
  }
  if (promo.targetType === PromoTargetType.PRODUCT) {
    return promo.productId !== null && promo.productId === product.id;
  }
  if (promo.targetType === PromoTargetType.PRODUCT_NAME) {
    return (
      normalizeComparableText(promo.targetTextValue) ===
      normalizeComparableText(product.name)
    );
  }
  if (promo.targetType === PromoTargetType.BRAND) {
    return (
      normalizeComparableText(promo.targetTextValue) ===
      normalizeComparableText(product.brand)
    );
  }
  if (promo.targetType === PromoTargetType.UNIT) {
    return (
      normalizeComparableText(promo.targetTextValue) ===
      normalizeComparableText(product.unit)
    );
  }
  return false;
}

async function recalculateAllDiscountsAndTotals(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true, businessId: true, outletId: true },
  });

  if (!order) throw new Error('Order tidak ditemukan');

  const { businessId, outletId } = order;

  const orderItems = await tx.orderItem.findMany({
    where: { orderId },
    select: {
      id: true,
      productId: true,
      unitPrice: true,
      quantity: true,
      lineSubtotal: true,
    },
  });

  if (orderItems.length === 0) {
    await recalculateOrderTotals(tx, orderId);
    return;
  }

  const productIds = [...new Set(orderItems.map((i) => i.productId))];
  const products = await tx.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      categoryId: true,
      name: true,
      brand: true,
      unit: true,
    },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  const promos = await tx.promo.findMany({
    where: { businessId, status: PromoStatus.ACTIVE },
    include: { promoOutlets: { select: { outletId: true } } },
    orderBy: [{ createdAt: 'desc' }],
  });

  const eligiblePromos = promos.filter((promo) => {
    if (!isPromoActiveNow(promo)) return false;
    const scope = promo.outletScope ?? PromoOutletScope.ALL_OUTLETS;
    if (scope === PromoOutletScope.ALL_OUTLETS) return true;
    return promo.promoOutlets.some((po) => po.outletId === outletId);
  });

  const regularPromos = eligiblePromos.filter((p) => p.minChargeAmount == null);
  const minChargePromos = eligiblePromos.filter((p) => p.minChargeAmount != null);

  type ItemCalc = {
    id: string;
    unitPrice: Prisma.Decimal;
    quantity: Prisma.Decimal;
    lineSubtotal: Prisma.Decimal;
    bestUnitDiscount: Prisma.Decimal;
    productId: string;
  };

  const itemCalcs: ItemCalc[] = orderItems.map((item) => {
    const product = productMap.get(item.productId);
    let bestUnitDiscount = new Prisma.Decimal(0);

    if (product) {
      for (const promo of regularPromos) {
        if (!isPromoMatchingProductData(promo, product)) continue;

        const discountValue = promo.discountValue ?? new Prisma.Decimal(0);
        let candidate =
          promo.discountType === PromoDiscountType.PERCENTAGE
            ? item.unitPrice.mul(discountValue).div(new Prisma.Decimal(100))
            : new Prisma.Decimal(discountValue);

        if (candidate.greaterThan(item.unitPrice)) {
          candidate = new Prisma.Decimal(item.unitPrice);
        }
        if (candidate.greaterThan(bestUnitDiscount)) {
          bestUnitDiscount = candidate;
        }
      }
    }

    return {
      id: item.id,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineSubtotal: item.lineSubtotal,
      bestUnitDiscount,
      productId: item.productId,
    };
  });

  // Additional discounts from min-charge promos (stacks on top of regular promos)
  const additionalUnitDiscounts = new Map<string, Prisma.Decimal>();

  for (const promo of minChargePromos) {
    const qualifyingItems: ItemCalc[] = [];
    let qualifyingSubtotal = new Prisma.Decimal(0);

    for (const calc of itemCalcs) {
      const product = productMap.get(calc.productId);
      if (!product) continue;
      if (!isPromoMatchingProductData(promo, product)) continue;
      qualifyingItems.push(calc);
      qualifyingSubtotal = qualifyingSubtotal.plus(calc.lineSubtotal);
    }

    if (promo.minChargeAmount && qualifyingSubtotal.lessThan(promo.minChargeAmount)) {
      continue;
    }

    for (const calc of qualifyingItems) {
      const discountValue = promo.discountValue ?? new Prisma.Decimal(0);
      let additionalPerUnit =
        promo.discountType === PromoDiscountType.PERCENTAGE
          ? calc.unitPrice.mul(discountValue).div(new Prisma.Decimal(100))
          : new Prisma.Decimal(discountValue);

      const current = additionalUnitDiscounts.get(calc.id) ?? new Prisma.Decimal(0);
      additionalUnitDiscounts.set(calc.id, current.plus(additionalPerUnit));
    }
  }

  for (const calc of itemCalcs) {
    const additionalPerUnit =
      additionalUnitDiscounts.get(calc.id) ?? new Prisma.Decimal(0);
    let totalUnitDiscount = calc.bestUnitDiscount.plus(additionalPerUnit);

    if (totalUnitDiscount.greaterThan(calc.unitPrice)) {
      totalUnitDiscount = new Prisma.Decimal(calc.unitPrice);
    }

    const lineDiscountAmount = totalUnitDiscount.mul(calc.quantity);
    const lineTotal = calc.lineSubtotal.minus(lineDiscountAmount);

    await tx.orderItem.update({
      where: { id: calc.id },
      data: { lineDiscountAmount, lineTotal },
    });
  }

  await recalculateOrderTotals(tx, orderId);
}

type ProductPricingWithPromo = {
  product: {
    id: string;
    name: string;
    code: string | null;
    sku: string | null;
    barcode: string | null;
    brand: string | null;
    unit: string | null;
    categoryId: string | null;
  };
  unitPrice: Prisma.Decimal;
  unitDiscountAmount: Prisma.Decimal;
  lineDiscountAmount: Prisma.Decimal;
  lineSubtotal: Prisma.Decimal;
  lineTotal: Prisma.Decimal;
};

async function getProductPricingForOrderItem(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    outletId: string;
    productId: string;
    quantity: number;
  },
): Promise<ProductPricingWithPromo> {
  const { businessId, outletId, productId, quantity } = params;

  const product = await tx.product.findFirst({
    where: {
      id: productId,
      businessId,
      status: 'ACTIVE',
    },
    include: {
      productOutletSettings: {
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

  const outletSetting = product.productOutletSettings[0];

  if (
    outletSetting &&
    (outletSetting.status !== ProductOutletStatus.ACTIVE ||
      !outletSetting.isAvailable)
  ) {
    throw new Error(`Product ${product.name} tidak tersedia di outlet ini`);
  }

  const unitPrice = outletSetting?.priceOverride ?? product.basePrice;
  const quantityDecimal = new Prisma.Decimal(quantity);
  const lineSubtotal = unitPrice.mul(quantityDecimal);

  const promos = await tx.promo.findMany({
    where: {
      businessId,
      status: PromoStatus.ACTIVE,
    },
    include: {
      promoOutlets: {
        select: {
          outletId: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const eligiblePromos = promos.filter((promo) => {
    if (!isPromoActiveNow(promo)) {
      return false;
    }

    const outletScope = promo.outletScope ?? PromoOutletScope.ALL_OUTLETS;

    if (outletScope === PromoOutletScope.ALL_OUTLETS) {
      return true;
    }

    return promo.promoOutlets.some((item) => item.outletId === outletId);
  });

  let bestUnitDiscount = new Prisma.Decimal(0);

  for (const promo of eligiblePromos) {
    let isMatch = false;

    if (promo.targetType === PromoTargetType.CATEGORY) {
      isMatch =
        promo.categoryId !== null && promo.categoryId === product.categoryId;
    } else if (promo.targetType === PromoTargetType.PRODUCT) {
      isMatch = promo.productId !== null && promo.productId === product.id;
    } else if (promo.targetType === PromoTargetType.PRODUCT_NAME) {
      isMatch =
        normalizeComparableText(promo.targetTextValue) ===
        normalizeComparableText(product.name);
    } else if (promo.targetType === PromoTargetType.BRAND) {
      isMatch =
        normalizeComparableText(promo.targetTextValue) ===
        normalizeComparableText(product.brand);
    } else if (promo.targetType === PromoTargetType.UNIT) {
      isMatch =
        normalizeComparableText(promo.targetTextValue) ===
        normalizeComparableText(product.unit);
    }

    if (!isMatch) {
      continue;
    }

    const discountValue = promo.discountValue ?? new Prisma.Decimal(0);

    let candidateUnitDiscount =
      promo.discountType === PromoDiscountType.PERCENTAGE
        ? unitPrice.mul(discountValue).div(new Prisma.Decimal(100))
        : new Prisma.Decimal(discountValue);

    if (candidateUnitDiscount.greaterThan(unitPrice)) {
      candidateUnitDiscount = new Prisma.Decimal(unitPrice);
    }

    if (candidateUnitDiscount.greaterThan(bestUnitDiscount)) {
      bestUnitDiscount = candidateUnitDiscount;
    }
  }

  const lineDiscountAmount = bestUnitDiscount.mul(quantityDecimal);
  const lineTotal = lineSubtotal.minus(lineDiscountAmount);

  return {
    product: {
      id: product.id,
      name: product.name,
      code: product.code,
      sku: product.sku,
      barcode: product.barcode,
      brand: product.brand,
      unit: product.unit,
      categoryId: product.categoryId,
    },
    unitPrice,
    unitDiscountAmount: bestUnitDiscount,
    lineDiscountAmount,
    lineSubtotal,
    lineTotal,
  };
}

async function recalculateOrderTotals(
  tx: Prisma.TransactionClient,
  orderId: string,
) {
  const orderRow = await tx.order.findUnique({
    where: { id: orderId },
    select: { id: true, outletId: true },
  });

  if (!orderRow) {
    throw new Error('Order tidak ditemukan');
  }

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

  const baseTotal = orderItems.reduce(
    (acc, item) => acc.plus(item.lineTotal),
    new Prisma.Decimal(0),
  );

  // Load outlet charges + rounding (with defaults if empty)
  const { charges, rounding } = await getOutletPosChargeSettings(orderRow.outletId);
  const applied = applyChargesAndRounding(baseTotal, charges, rounding);

  return tx.order.update({
    where: { id: orderId },
    data: {
      subtotal,
      discountAmount,
      taxAmount: applied.taxAmount,
      serviceChargeAmount: applied.serviceChargeAmount,
      totalAmount: applied.grandTotal,
    },
  });
}

function mapOrderSummary(order: {
  id: string;
  orderNumber: string;
  businessId: string;
  outletId: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  tableId: string | null;
  table: { name: string } | null;
  customerName: string | null;
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
  const isGuestOrder = isGuestOrderNumber(order.orderNumber);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    businessId: order.businessId,
    outletId: order.outletId,
    orderType: order.orderType,
    status: order.status,
    paymentStatus: order.paymentStatus,
    tableId: order.tableId,
    tableName: order.table?.name ?? null,
    customerName: order.customerName,
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
    isGuestOrder,
    orderSource: isGuestOrder ? 'GUEST' : 'STAFF',
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

  if (params.source === 'GUEST') {
    where.orderNumber = {
      startsWith: 'GUEST-',
    };
  } else if (params.source === 'STAFF') {
    where.NOT = {
      orderNumber: {
        startsWith: 'GUEST-',
      },
    };
  }

  if (params.queue === 'CASHIER_ACTIVE') {
    where.status = {
      in: [
        OrderStatus.DRAFT,
        OrderStatus.SUBMITTED,
        OrderStatus.IN_PROGRESS,
        OrderStatus.READY,
      ],
    };
  }

  if (params.queue === 'CASHIER_UNPAID') {
    where.status = {
      in: [
        OrderStatus.DRAFT,
        OrderStatus.SUBMITTED,
        OrderStatus.IN_PROGRESS,
        OrderStatus.READY,
      ],
    };
    where.paymentStatus = PaymentStatus.UNPAID;
  }

  if (params.queue === 'GUEST_WAITING_PAYMENT') {
    where.orderNumber = {
      startsWith: 'GUEST-',
    };
    where.status = OrderStatus.DRAFT;
    where.paymentStatus = PaymentStatus.UNPAID;
  }

  if (params.queue === 'DINE_IN_OPEN') {
    where.orderType = OrderType.DINE_IN;
    where.status = {
      in: [
        OrderStatus.DRAFT,
        OrderStatus.SUBMITTED,
        OrderStatus.IN_PROGRESS,
        OrderStatus.READY,
      ],
    };
    where.paymentStatus = PaymentStatus.UNPAID;
  }

  if (params.status) {
    where.status = params.status;
  }

  if (params.paymentStatus) {
    where.paymentStatus = params.paymentStatus;
  }

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
      orderBy: [
        {
          submittedAt: 'desc',
        },
        {
          createdAt: 'desc',
        },
      ],
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
  const pricing = await getProductPricingForOrderItem(tx, {
    businessId: params.businessId,
    outletId: params.outletId,
    productId: params.item.productId,
    quantity: params.item.quantity,
  });

  const quantityDecimal = new Prisma.Decimal(params.item.quantity);

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
      lineSubtotal: pricing.lineSubtotal,
      lineDiscountAmount: pricing.lineDiscountAmount,
      lineTotal: pricing.lineTotal,
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

    await enforceMonthlyTransactionLimit({
      reader: tx,
      businessId: input.businessId,
      blockedAction: 'CREATE_ORDER',
    });

    const orderNumber = await generateOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        createdByBusinessUserId: input.businessUserId,
        orderType: input.orderType ?? OrderType.QUICK_SERVICE,
        tableId: input.tableId ?? null,
        orderNumber,
        customerName: input.customerName?.trim() || null,
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

    await recalculateAllDiscountsAndTotals(tx, order.id);

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
        orderType: true,
        status: true,
      },
    });

    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    const isDineIn = order.orderType === OrderType.DINE_IN;
    const addableStatuses: OrderStatus[] = isDineIn
      ? [OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.IN_PROGRESS]
      : [OrderStatus.DRAFT];

    if (!addableStatuses.includes(order.status)) {
      throw new Error(
        isDineIn
          ? 'Item hanya bisa ditambah saat order masih berlangsung (draft/submitted/in progress)'
          : 'Hanya order draft yang bisa ditambah item',
      );
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

    await recalculateAllDiscountsAndTotals(tx, order.id);

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
        orderType: true,
        status: true,
      },
    });

    if (!order) {
      throw new Error('Order tidak ditemukan');
    }

    const isDineIn = order.orderType === OrderType.DINE_IN;
    const editableStatuses: OrderStatus[] = isDineIn
      ? [OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.IN_PROGRESS]
      : [OrderStatus.DRAFT];

    if (!editableStatuses.includes(order.status)) {
      throw new Error(
        isDineIn
          ? 'Item hanya bisa diubah saat order masih berlangsung (draft/submitted/in progress)'
          : 'Hanya order draft yang bisa diubah',
      );
    }

    const item = await tx.orderItem.findFirst({
      where: {
        id: input.itemId,
        orderId: input.orderId,
      },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!item) {
      throw new Error('Item order tidak ditemukan');
    }

    const pricing = await getProductPricingForOrderItem(tx, {
      businessId: input.businessId,
      outletId: input.outletId,
      productId: item.productId,
      quantity: input.quantity,
    });

    const quantityDecimal = new Prisma.Decimal(input.quantity);

    await tx.orderItem.update({
      where: {
        id: item.id,
      },
      data: {
        quantity: quantityDecimal,
        note: input.note?.trim() || null,
        lineSubtotal: pricing.lineSubtotal,
        lineDiscountAmount: pricing.lineDiscountAmount,
        lineTotal: pricing.lineTotal,
      },
    });

    await recalculateAllDiscountsAndTotals(tx, input.orderId);

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

export async function removeOrderItem(input: {
  orderId: string;
  itemId: string;
  outletId: string;
  businessId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: {
        id: input.orderId,
        businessId: input.businessId,
        outletId: input.outletId,
      },
      select: { id: true, orderType: true, status: true },
    });

    if (!order) throw new Error('Order tidak ditemukan');

    const isDineIn = order.orderType === OrderType.DINE_IN;
    const editableStatuses: OrderStatus[] = isDineIn
      ? [OrderStatus.DRAFT, OrderStatus.SUBMITTED, OrderStatus.IN_PROGRESS]
      : [OrderStatus.DRAFT];

    if (!editableStatuses.includes(order.status)) {
      throw new Error(
        isDineIn
          ? 'Item hanya bisa dihapus saat order masih berlangsung'
          : 'Hanya order draft yang bisa diubah',
      );
    }

    const item = await tx.orderItem.findFirst({
      where: { id: input.itemId, orderId: input.orderId },
      select: { id: true },
    });

    if (!item) throw new Error('Item tidak ditemukan');

    await tx.orderItem.delete({ where: { id: input.itemId } });

    await recalculateAllDiscountsAndTotals(tx, input.orderId);

    return getOrderByIdInternal(tx, {
      orderId: input.orderId,
      businessId: input.businessId,
      outletId: input.outletId,
    });
  });
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

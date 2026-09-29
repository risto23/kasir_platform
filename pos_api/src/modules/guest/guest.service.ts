import { createHmac, timingSafeEqual } from 'crypto';
import {
  BusinessRoleCode,
  BusinessType,
  OutletTableStatus,
  PaymentStatus,
  Prisma,
  PromoDiscountType,
  PromoOutletScope,
  PromoStatus,
  PromoTargetType,
  OrderItemStatus,
  OrderStatus,
  ProductOutletStatus,
  ProductStatus,
  BusinessUserStatus,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import {
  applyChargesAndRounding,
  getOutletPosChargeSettings,
} from '../pos-settings/pos-settings.service';
import type {
  CreateGuestOrderInput,
  CreatedGuestOrderResponse,
  GuestMenuItem,
  GuestMenuResponse,
} from './guest.types';

class GuestModuleError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

type ProductWithOutletSetting = {
  id: string;
  businessId: string;
  categoryId: string | null;
  name: string;
  code: string;
  sku: string | null;
  barcode: string | null;
  brand: string | null;
  unit: string | null;
  description: string | null;
  imageUrl: string | null;
  basePrice: Prisma.Decimal;
  category: {
    id: string;
    name: string;
  } | null;
  productOutletSettings: Array<{
    outletId: string;
    priceOverride: Prisma.Decimal | null;
    isAvailable: boolean;
    status: ProductOutletStatus;
  }>;
};

type ActivePromo = {
  id: string;
  name: string;
  targetType: PromoTargetType;
  targetTextValue: string | null;
  discountType: PromoDiscountType;
  discountValue: Prisma.Decimal;
  categoryId: string | null;
  productId: string | null;
};

type PreparedGuestOrderItem = {
  product: ProductWithOutletSetting;
  quantity: number;
  note: string | null;
  unitPrice: number;
  lineSubtotal: number;
  lineDiscountAmount: number;
  lineTotal: number;
};

type SanitizedGuestOrderInput = {
  tableId: string;
  token: string;
  guestName: string | null;
  notes: string | null;
  items: Array<{
    productId: string;
    quantity: number;
    note: string | null;
  }>;
};

const MAX_GUEST_ORDER_ITEMS = 50;
const MAX_GUEST_ITEM_QUANTITY = 99;
const MAX_GUEST_NAME_LENGTH = 100;
const MAX_GUEST_ORDER_NOTES_LENGTH = 500;
const MAX_GUEST_ITEM_NOTE_LENGTH = 200;
const TOKEN_VERSION = 'v1';
const TOKEN_PREFIX = 'guestqr';

function normalizeString(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeLimitedString(
  value: string | null | undefined,
  maxLength: number,
): string | null {
  const normalized = normalizeString(value);

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

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

function getCurrentDateParts() {
  const now = new Date();
  const currentTime = now.toISOString().slice(11, 16);

  return {
    now,
    currentTime,
  };
}

function getGuestQrSecret(): string {
  const explicitSecret =
    process.env.GUEST_QR_SECRET ??
    process.env.POS_GUEST_QR_SECRET;

  if (typeof explicitSecret === 'string' && explicitSecret.trim() !== '') {
    return explicitSecret.trim();
  }

  if (process.env.NODE_ENV !== 'production' && process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }

  throw new GuestModuleError('Konfigurasi token guest belum tersedia', 500);
}

function buildGuestTokenPayload(outletId: string, tableId: string): string {
  return `${TOKEN_PREFIX}:${TOKEN_VERSION}:${outletId}:${tableId}`;
}

function buildExpectedGuestToken(outletId: string, tableId: string): string {
  const secret = getGuestQrSecret();
  const rawPayload = buildGuestTokenPayload(outletId, tableId);
  const signature = createHmac('sha256', secret).update(rawPayload).digest('hex');

  return `${rawPayload}:${signature}`;
}

function verifyGuestToken(outletId: string, tableId: string, token: string): void {
  const trimmedToken = token.trim();

  if (trimmedToken === '') {
    throw new GuestModuleError('Token guest wajib diisi', 401);
  }

  const expectedToken = buildExpectedGuestToken(outletId, tableId);
  const providedBuffer = Buffer.from(trimmedToken, 'utf8');
  const expectedBuffer = Buffer.from(expectedToken, 'utf8');

  if (providedBuffer.length !== expectedBuffer.length) {
    throw new GuestModuleError('Token guest tidak valid', 401);
  }

  const isValid = timingSafeEqual(providedBuffer, expectedBuffer);

  if (!isValid) {
    throw new GuestModuleError('Token guest tidak valid', 401);
  }
}

function sanitizeGuestOrderInput(input: CreateGuestOrderInput): SanitizedGuestOrderInput {
  const tableId = normalizeString(input.tableId);
  const token = normalizeString(input.token);
  const guestName = normalizeLimitedString(input.guestName, MAX_GUEST_NAME_LENGTH);
  const notes = normalizeLimitedString(input.notes, MAX_GUEST_ORDER_NOTES_LENGTH);

  if (!tableId) {
    throw new GuestModuleError('tableId wajib diisi', 400);
  }

  if (!token) {
    throw new GuestModuleError('token wajib diisi', 400);
  }

  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new GuestModuleError('items minimal 1', 400);
  }

  if (input.items.length > MAX_GUEST_ORDER_ITEMS) {
    throw new GuestModuleError(`items maksimal ${MAX_GUEST_ORDER_ITEMS}`, 400);
  }

  const normalizedItems = input.items.map((item) => {
    const productId = normalizeString(item.productId);
    const note = normalizeLimitedString(item.note, MAX_GUEST_ITEM_NOTE_LENGTH);
    const quantity = Number(item.quantity);

    if (!productId) {
      throw new GuestModuleError('productId wajib diisi', 400);
    }

    if (!Number.isFinite(quantity) || !Number.isInteger(quantity)) {
      throw new GuestModuleError('quantity harus berupa bilangan bulat', 400);
    }

    if (quantity <= 0) {
      throw new GuestModuleError('quantity harus lebih dari 0', 400);
    }

    if (quantity > MAX_GUEST_ITEM_QUANTITY) {
      throw new GuestModuleError(`quantity maksimal ${MAX_GUEST_ITEM_QUANTITY}`, 400);
    }

    return {
      productId,
      quantity,
      note,
    };
  });

  const uniqueProductIds = new Set(normalizedItems.map((item) => item.productId));

  if (uniqueProductIds.size !== normalizedItems.length) {
    throw new GuestModuleError(
      'Duplicate productId tidak diizinkan pada guest order. Gabungkan quantity di frontend.',
      400,
    );
  }

  return {
    tableId,
    token,
    guestName,
    notes,
    items: normalizedItems,
  };
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
      address: true,
      phone: true,
      business: {
        select: {
          id: true,
          businessType: true,
          status: true,
        },
      },
    },
  });

  if (!outlet) {
    throw new GuestModuleError('Outlet restaurant tidak ditemukan', 404);
  }

  return outlet;
}

async function getActiveTableForOutletOrThrow(outletId: string, tableId: string) {
  const table = await prisma.outletTable.findFirst({
    where: {
      id: tableId,
      outletId,
      status: OutletTableStatus.ACTIVE,
    },
    select: {
      id: true,
      code: true,
      name: true,
      capacity: true,
      outletId: true,
    },
  });

  if (!table) {
    throw new GuestModuleError('Meja outlet tidak ditemukan', 404);
  }

  return table;
}

async function getActivePromosForOutlet(
  businessId: string,
  outletId: string,
): Promise<ActivePromo[]> {
  const { now, currentTime } = getCurrentDateParts();

  const promos = await prisma.promo.findMany({
    where: {
      businessId,
      status: PromoStatus.ACTIVE,
      startDate: {
        lte: now,
      },
      endDate: {
        gte: now,
      },
      startTime: {
        lte: currentTime,
      },
      endTime: {
        gte: currentTime,
      },
      OR: [
        {
          outletScope: PromoOutletScope.ALL_OUTLETS,
        },
        {
          outletScope: PromoOutletScope.SELECTED_OUTLETS,
          promoOutlets: {
            some: {
              outletId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      targetType: true,
      targetTextValue: true,
      discountType: true,
      discountValue: true,
      categoryId: true,
      productId: true,
    },
  });

  return promos;
}

function getPromoDiscountAmount(
  basePrice: number,
  promo: ActivePromo,
): number {
  if (promo.discountType === PromoDiscountType.PERCENTAGE) {
    const percentageValue = toNumber(promo.discountValue);
    const calculated = (basePrice * percentageValue) / 100;
    return roundCurrency(Math.min(calculated, basePrice));
  }

  const fixedAmount = toNumber(promo.discountValue);
  return roundCurrency(Math.min(fixedAmount, basePrice));
}

function isPromoMatchedToProduct(
  promo: ActivePromo,
  product: ProductWithOutletSetting,
): boolean {
  switch (promo.targetType) {
    case PromoTargetType.PRODUCT:
      return promo.productId === product.id;
    case PromoTargetType.CATEGORY:
      return promo.categoryId !== null && promo.categoryId === product.categoryId;
    case PromoTargetType.PRODUCT_NAME:
      return (
        normalizeString(promo.targetTextValue)?.toLowerCase() ===
        product.name.toLowerCase()
      );
    case PromoTargetType.BRAND:
      return (
        normalizeString(promo.targetTextValue)?.toLowerCase() ===
        normalizeString(product.brand)?.toLowerCase()
      );
    case PromoTargetType.UNIT:
      return (
        normalizeString(promo.targetTextValue)?.toLowerCase() ===
        normalizeString(product.unit)?.toLowerCase()
      );
    default:
      return false;
  }
}

function getBestPromoForProduct(
  product: ProductWithOutletSetting,
  activePromos: ActivePromo[],
  effectivePrice: number,
): {
  promo: ActivePromo | null;
  discountAmount: number;
} {
  let selectedPromo: ActivePromo | null = null;
  let bestDiscountAmount = 0;

  for (const promo of activePromos) {
    const matched = isPromoMatchedToProduct(promo, product);

    if (!matched) {
      continue;
    }

    const discountAmount = getPromoDiscountAmount(effectivePrice, promo);

    if (discountAmount > bestDiscountAmount) {
      bestDiscountAmount = discountAmount;
      selectedPromo = promo;
    }
  }

  return {
    promo: selectedPromo,
    discountAmount: bestDiscountAmount,
  };
}

async function getGuestMenuProducts(outletId: string): Promise<ProductWithOutletSetting[]> {
  const products = await prisma.product.findMany({
    where: {
      status: ProductStatus.ACTIVE,
      business: {
        outlets: {
          some: {
            id: outletId,
            status: 'ACTIVE',
          },
        },
      },
      productOutletSettings: {
        some: {
          outletId,
          status: ProductOutletStatus.ACTIVE,
          isAvailable: true,
        },
      },
    },
    select: {
      id: true,
      businessId: true,
      categoryId: true,
      name: true,
      code: true,
      sku: true,
      barcode: true,
      brand: true,
      unit: true,
      description: true,
      imageUrl: true,
      basePrice: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      productOutletSettings: {
        where: {
          outletId,
          status: ProductOutletStatus.ACTIVE,
          isAvailable: true,
        },
        select: {
          outletId: true,
          priceOverride: true,
          isAvailable: true,
          status: true,
        },
      },
    },
    orderBy: [
      {
        category: {
          sortOrder: 'asc',
        },
      },
      {
        name: 'asc',
      },
    ],
  });

  return products;
}

function mapGuestMenuItems(
  products: ProductWithOutletSetting[],
  activePromos: ActivePromo[],
): GuestMenuItem[] {
  return products.map((product) => {
    const outletSetting = product.productOutletSettings[0];
    const basePrice = roundCurrency(toNumber(product.basePrice));
    const outletPrice =
      outletSetting?.priceOverride !== null && outletSetting?.priceOverride !== undefined
        ? roundCurrency(toNumber(outletSetting.priceOverride))
        : basePrice;

    const bestPromo = getBestPromoForProduct(product, activePromos, outletPrice);
    const finalPrice = roundCurrency(Math.max(outletPrice - bestPromo.discountAmount, 0));

    return {
      id: product.id,
      categoryId: product.categoryId,
      categoryName: product.category?.name ?? null,
      name: product.name,
      code: product.code,
      sku: product.sku,
      barcode: product.barcode,
      brand: product.brand,
      unit: product.unit,
      description: product.description,
      imageUrl: product.imageUrl,
      basePrice,
      outletPrice,
      discountAmount: bestPromo.discountAmount,
      finalPrice,
      promo: bestPromo.promo
        ? {
            id: bestPromo.promo.id,
            name: bestPromo.promo.name,
            targetType: bestPromo.promo.targetType,
            discountType: bestPromo.promo.discountType,
            discountValue: roundCurrency(toNumber(bestPromo.promo.discountValue)),
          }
        : null,
    };
  });
}

async function resolveGuestOrderCreatorBusinessUserId(
  businessId: string,
  outletId: string,
): Promise<string> {
  const ownerOrAdmin = await prisma.businessUser.findFirst({
    where: {
      businessId,
      status: BusinessUserStatus.ACTIVE,
      OR: [
        {
          hasAllOutletAccess: true,
        },
        {
          outletAccesses: {
            some: {
              outletId,
            },
          },
        },
      ],
      businessRole: {
        code: {
          in: [BusinessRoleCode.OWNER, BusinessRoleCode.ADMIN, BusinessRoleCode.CASHIER],
        },
      },
    },
    orderBy: [
      {
        businessRole: {
          code: 'asc',
        },
      },
      {
        createdAt: 'asc',
      },
    ],
    select: {
      id: true,
    },
  });

  if (ownerOrAdmin?.id) {
    return ownerOrAdmin.id;
  }

  const anyActiveBusinessUser = await prisma.businessUser.findFirst({
    where: {
      businessId,
      status: BusinessUserStatus.ACTIVE,
      OR: [
        {
          hasAllOutletAccess: true,
        },
        {
          outletAccesses: {
            some: {
              outletId,
            },
          },
        },
      ],
    },
    orderBy: {
      createdAt: 'asc',
    },
    select: {
      id: true,
    },
  });

  if (!anyActiveBusinessUser?.id) {
    throw new GuestModuleError(
      'Belum ada business user aktif untuk mencatat guest order di outlet ini',
      400,
    );
  }

  return anyActiveBusinessUser.id;
}

async function generateGuestOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const today = new Date();
  const year = String(today.getFullYear());
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const datePart = `${year}${month}${day}`;

  const likePrefix = `GUEST-${datePart}-`;

  const lastOrder = await tx.order.findFirst({
    where: {
      orderNumber: {
        startsWith: likePrefix,
      },
    },
    orderBy: {
      orderNumber: 'desc',
    },
    select: {
      orderNumber: true,
    },
  });

  const lastSequenceText = lastOrder?.orderNumber.split('-').pop();
  const lastSequence = lastSequenceText ? Number(lastSequenceText) : 0;
  const nextSequence = Number.isNaN(lastSequence) ? 1 : lastSequence + 1;

  return `${likePrefix}${String(nextSequence).padStart(4, '0')}`;
}

function prepareGuestOrderItems(params: {
  input: SanitizedGuestOrderInput;
  productMap: Map<string, ProductWithOutletSetting>;
  activePromos: ActivePromo[];
}): PreparedGuestOrderItem[] {
  const { input, productMap, activePromos } = params;

  return input.items.map((item) => {
    const product = productMap.get(item.productId);

    if (!product) {
      throw new GuestModuleError('Product guest order tidak ditemukan', 404);
    }

    const outletSetting = product.productOutletSettings[0];
    const basePrice = roundCurrency(toNumber(product.basePrice));
    const unitPrice =
      outletSetting?.priceOverride !== null && outletSetting?.priceOverride !== undefined
        ? roundCurrency(toNumber(outletSetting.priceOverride))
        : basePrice;

    const bestPromo = getBestPromoForProduct(product, activePromos, unitPrice);
    const quantity = item.quantity;
    const lineSubtotal = roundCurrency(unitPrice * quantity);
    const lineDiscountAmount = roundCurrency(bestPromo.discountAmount * quantity);
    const lineTotal = roundCurrency(Math.max(lineSubtotal - lineDiscountAmount, 0));

    return {
      product,
      quantity,
      note: item.note,
      unitPrice,
      lineSubtotal,
      lineDiscountAmount,
      lineTotal,
    };
  });
}

export async function getGuestMenu(
  outletId: string,
  tableId: string,
  token: string,
): Promise<GuestMenuResponse> {
  verifyGuestToken(outletId, tableId, token);

  const outlet = await getRestaurantOutletOrThrow(outletId);
  const table = await getActiveTableForOutletOrThrow(outletId, tableId);

  const [products, activePromos] = await Promise.all([
    getGuestMenuProducts(outletId),
    getActivePromosForOutlet(outlet.businessId, outletId),
  ]);

  const mappedItems = mapGuestMenuItems(products, activePromos);

  const categoryMap = new Map<
    string,
    {
      categoryId: string | null;
      categoryName: string | null;
      items: GuestMenuItem[];
    }
  >();

  for (const item of mappedItems) {
    const key = item.categoryId ?? 'uncategorized';

    const existing = categoryMap.get(key);

    if (existing) {
      existing.items.push(item);
      continue;
    }

    categoryMap.set(key, {
      categoryId: item.categoryId,
      categoryName: item.categoryName,
      items: [item],
    });
  }

  return {
    outlet: {
      id: outlet.id,
      name: outlet.name,
      code: outlet.code,
      address: outlet.address,
      phone: outlet.phone,
    },
    table: {
      id: table.id,
      code: table.code,
      name: table.name,
      capacity: table.capacity,
    },
    categories: Array.from(categoryMap.values()),
  };
}

export async function createGuestOrder(
  outletId: string,
  input: CreateGuestOrderInput,
): Promise<CreatedGuestOrderResponse> {
  const sanitizedInput = sanitizeGuestOrderInput(input);

  verifyGuestToken(outletId, sanitizedInput.tableId, sanitizedInput.token);

  const outlet = await getRestaurantOutletOrThrow(outletId);
  const table = await getActiveTableForOutletOrThrow(outletId, sanitizedInput.tableId);

  const productIds = sanitizedInput.items.map((item) => item.productId);

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: productIds,
      },
      businessId: outlet.businessId,
      status: ProductStatus.ACTIVE,
      productOutletSettings: {
        some: {
          outletId,
          status: ProductOutletStatus.ACTIVE,
          isAvailable: true,
        },
      },
    },
    select: {
      id: true,
      businessId: true,
      categoryId: true,
      name: true,
      code: true,
      sku: true,
      barcode: true,
      brand: true,
      unit: true,
      description: true,
      imageUrl: true,
      basePrice: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      productOutletSettings: {
        where: {
          outletId,
          status: ProductOutletStatus.ACTIVE,
          isAvailable: true,
        },
        select: {
          outletId: true,
          priceOverride: true,
          isAvailable: true,
          status: true,
        },
      },
    },
  });

  if (products.length !== productIds.length) {
    throw new GuestModuleError(
      'Ada item guest order yang tidak valid atau tidak tersedia di outlet ini',
      400,
    );
  }

  const activePromos = await getActivePromosForOutlet(outlet.businessId, outletId);
  const creatorBusinessUserId = await resolveGuestOrderCreatorBusinessUserId(
    outlet.businessId,
    outletId,
  );

  const productMap = new Map<string, ProductWithOutletSetting>();
  for (const product of products) {
    productMap.set(product.id, product);
  }

  const preparedItems = prepareGuestOrderItems({
    input: sanitizedInput,
    productMap,
    activePromos,
  });

  const subtotal = roundCurrency(
    preparedItems.reduce((sum, item) => sum + item.lineSubtotal, 0),
  );
  const discountAmount = roundCurrency(
    preparedItems.reduce((sum, item) => sum + item.lineDiscountAmount, 0),
  );
  // Same outlet tax/service/rounding rules as staff orders (order.service
  // recalculateOrderTotals), so a QR order is billed like a cashier order.
  const { charges, rounding } = await getOutletPosChargeSettings(outletId);
  const applied = applyChargesAndRounding(
    new Prisma.Decimal(subtotal).minus(discountAmount),
    charges,
    rounding,
  );
  const taxAmount = applied.taxAmount;
  const serviceChargeAmount = applied.serviceChargeAmount;
  const totalAmount = applied.grandTotal;

  const createdOrder = await prisma.$transaction(async (tx) => {
    const orderNumber = await generateGuestOrderNumber(tx);

    const order = await tx.order.create({
      data: {
        businessId: outlet.businessId,
        outletId,
        createdByBusinessUserId: creatorBusinessUserId,
        tableId: table.id,
        orderNumber,
        notes: sanitizedInput.notes,
        status: OrderStatus.DRAFT,
        paymentStatus: PaymentStatus.UNPAID,
        subtotal,
        discountAmount,
        taxAmount,
        serviceChargeAmount,
        totalAmount,
        items: {
          create: preparedItems.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            productCode: item.product.code,
            productSku: item.product.sku,
            productBarcode: item.product.barcode,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            note: item.note,
            lineSubtotal: item.lineSubtotal,
            lineDiscountAmount: item.lineDiscountAmount,
            lineTotal: item.lineTotal,
            status: OrderItemStatus.PENDING,
          })),
        },
      },
      include: {
        items: {
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    return order;
  });

  return {
    id: createdOrder.id,
    businessId: createdOrder.businessId,
    outletId: createdOrder.outletId,
    tableId: createdOrder.tableId,
    orderNumber: createdOrder.orderNumber,
    status: createdOrder.status,
    paymentStatus: createdOrder.paymentStatus,
    guestName: sanitizedInput.guestName,
    notes: createdOrder.notes,
    subtotal: roundCurrency(toNumber(createdOrder.subtotal)),
    discountAmount: roundCurrency(toNumber(createdOrder.discountAmount)),
    taxAmount: roundCurrency(toNumber(createdOrder.taxAmount)),
    serviceChargeAmount: roundCurrency(toNumber(createdOrder.serviceChargeAmount)),
    totalAmount: roundCurrency(toNumber(createdOrder.totalAmount)),
    submittedAt: createdOrder.submittedAt ? createdOrder.submittedAt.toISOString() : null,
    createdAt: createdOrder.createdAt.toISOString(),
    items: createdOrder.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      productCode: item.productCode,
      quantity: roundCurrency(toNumber(item.quantity)),
      unitPrice: roundCurrency(toNumber(item.unitPrice)),
      discountAmount: roundCurrency(toNumber(item.lineDiscountAmount)),
      lineSubtotal: roundCurrency(toNumber(item.lineSubtotal)),
      lineTotal: roundCurrency(toNumber(item.lineTotal)),
      note: item.note,
      status: item.status,
    })),
  };
}

export function getGuestModuleErrorStatus(error: unknown): number {
  if (error instanceof GuestModuleError) {
    return error.statusCode;
  }

  return 500;
}

export function getGuestModuleErrorMessage(error: unknown): string {
  if (error instanceof GuestModuleError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan pada guest module';
}

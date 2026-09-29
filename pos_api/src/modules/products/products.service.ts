import {
  Prisma,
  ProductStatus,
  ProductOutletStatus,
  BusinessType,
  PromoDiscountType,
  PromoOutletScope,
  PromoStatus,
  PromoTargetType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import { enforceProductLimit } from '../../middlewares/subscription-limit.middleware';
import type {
  ProductListQuery,
  ProductParams,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductStatusBody,
  ProductAppliedPromo,
  ProductListItem,
} from './products.types';

function normalizeCode(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.trim().toUpperCase();
}

function normalizeSku(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.trim().toUpperCase();
}

function normalizeBarcode(value?: string | null) {
  if (!value) {
    return null;
  }

  return value.trim().toUpperCase();
}

function normalizeNullableText(value?: string | null) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeName(value: string) {
  return value.trim();
}

function sanitizeSearch(search?: string) {
  const trimmed = search?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function sanitizeOutletId(outletId?: string) {
  const trimmed = outletId?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function slugifyProductName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function toNumber(value: Prisma.Decimal | string | number | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (value instanceof Prisma.Decimal) {
    return Number(value.toString());
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toDecimalString(
  value: Prisma.Decimal | string | number | null | undefined,
): string {
  if (value === null || value === undefined) {
    return '0';
  }

  if (value instanceof Prisma.Decimal) {
    return value.toString();
  }

  return new Prisma.Decimal(value).toString();
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
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

function normalizeComparableText(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

async function getBusinessOrThrow(businessId: string) {
  const business = await prisma.business.findFirst({
    where: {
      id: businessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
      businessType: true,
    },
  });

  if (!business) {
    throw createHttpError('Business tidak ditemukan.', 404);
  }

  return business;
}

async function generateProductCode(
  businessId: string,
  businessType: BusinessType,
  productName: string,
) {
  const prefix = businessType === BusinessType.RESTAURANT ? 'MENU' : 'PRD';
  const baseSlug = slugifyProductName(productName) || 'ITEM';

  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `${prefix}-${baseSlug}-${String(index).padStart(3, '0')}`;

    const existing = await prisma.product.findFirst({
      where: {
        businessId,
        code: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw createHttpError('Gagal generate code product.', 500);
}

async function ensureCategoryExists(businessId: string, categoryId?: string | null) {
  if (!categoryId) {
    return null;
  }

  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      businessId,
    },
  });

  if (!category) {
    throw createHttpError('Kategori tidak ditemukan pada business ini.', 404);
  }

  return category;
}

async function ensureOutletExistsInBusiness(
  businessId: string,
  outletId?: string,
) {
  if (!outletId) {
    return null;
  }

  const outlet = await prisma.outlet.findFirst({
    where: {
      id: outletId,
      businessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  if (!outlet) {
    throw createHttpError('Outlet tidak ditemukan pada business ini.', 404);
  }

  return outlet;
}

async function ensureProductExists(businessId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      businessId,
    },
    include: {
      category: true,
    },
  });

  if (!product) {
    throw createHttpError('Product tidak ditemukan.', 404);
  }

  return product;
}

async function ensureProductNameUnique(
  businessId: string,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.product.findFirst({
    where: {
      businessId,
      name,
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('Nama product sudah digunakan di business ini.', 409);
  }
}

async function ensureProductCodeUnique(
  businessId: string,
  code?: string | null,
  excludeId?: string,
) {
  if (!code) {
    return;
  }

  const existing = await prisma.product.findFirst({
    where: {
      businessId,
      code,
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('Code product sudah digunakan di business ini.', 409);
  }
}

async function ensureProductSkuUnique(
  businessId: string,
  sku?: string | null,
  excludeId?: string,
) {
  if (!sku) {
    return;
  }

  const existing = await prisma.product.findFirst({
    where: {
      businessId,
      sku,
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('SKU product sudah digunakan di business ini.', 409);
  }
}

async function ensureProductBarcodeUnique(
  businessId: string,
  barcode?: string | null,
  excludeId?: string,
) {
  if (!barcode) {
    return;
  }

  const existing = await prisma.product.findFirst({
    where: {
      businessId,
      barcode,
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('Barcode product sudah digunakan di business ini.', 409);
  }
}

type ProductWithCategory = Prisma.ProductGetPayload<{
  include: {
    category: true;
  };
}>;

type PromoForProductResolution = {
  id: string;
  name: string;
  targetType: PromoTargetType;
  categoryId: string | null;
  productId: string | null;
  targetTextValue: string | null;
  discountType: PromoDiscountType;
  discountValue: Prisma.Decimal | null;
  minChargeAmount: Prisma.Decimal | null;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  status: PromoStatus;
  outletScope: PromoOutletScope | null;
  promoOutlets: Array<{
    outletId: string;
  }>;
};

async function getActivePromosForProducts(
  businessId: string,
  outletId?: string,
): Promise<PromoForProductResolution[]> {
  const promos = await prisma.promo.findMany({
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

  return promos.filter((promo) => {
    if (!isPromoActiveNow(promo)) {
      return false;
    }

    const outletScope = promo.outletScope ?? PromoOutletScope.ALL_OUTLETS;

    if (outletScope === PromoOutletScope.ALL_OUTLETS) {
      return true;
    }

    if (!outletId) {
      return false;
    }

    return promo.promoOutlets.some((item) => item.outletId === outletId);
  });
}

function doesPromoMatchProduct(
  promo: PromoForProductResolution,
  product: ProductWithCategory,
) {
  if (promo.targetType === PromoTargetType.CATEGORY) {
    return promo.categoryId !== null && promo.categoryId === product.categoryId;
  }

  if (promo.targetType === PromoTargetType.PRODUCT) {
    return promo.productId !== null && promo.productId === product.id;
  }

  const promoTargetText = normalizeComparableText(promo.targetTextValue);

  if (!promoTargetText) {
    return false;
  }

  if (promo.targetType === PromoTargetType.PRODUCT_NAME) {
    return normalizeComparableText(product.name) === promoTargetText;
  }

  if (promo.targetType === PromoTargetType.BRAND) {
    return normalizeComparableText(product.brand) === promoTargetText;
  }

  if (promo.targetType === PromoTargetType.UNIT) {
    return normalizeComparableText(product.unit) === promoTargetText;
  }

  return false;
}

function calculatePromoDiscountAmount(
  basePrice: number,
  discountType: PromoDiscountType,
  discountValue: Prisma.Decimal | null,
) {
  const parsedDiscountValue = toNumber(discountValue);

  if (discountType === PromoDiscountType.PERCENTAGE) {
    const percentageDiscount = (basePrice * parsedDiscountValue) / 100;
    return percentageDiscount > basePrice ? basePrice : percentageDiscount;
  }

  return parsedDiscountValue > basePrice ? basePrice : parsedDiscountValue;
}

function resolvePromoTargetValue(promo: PromoForProductResolution): string {
  if (promo.targetType === PromoTargetType.CATEGORY) {
    return promo.categoryId ?? '';
  }

  if (promo.targetType === PromoTargetType.PRODUCT) {
    return promo.productId ?? '';
  }

  return promo.targetTextValue ?? '';
}

function resolveBestPromoForProduct(
  product: ProductWithCategory,
  promos: PromoForProductResolution[],
  unitPrice: number,
): ProductAppliedPromo | null {
  // Menu headline reflects unconditional (regular) promos only and stacks them
  // all. Min-charge promos are order-level (depend on the cart total) so they
  // are applied at checkout by the order service, not shown on the menu price.
  const matchedPromos = promos.filter(
    (promo) =>
      promo.minChargeAmount == null && doesPromoMatchProduct(promo, product),
  );

  if (matchedPromos.length === 0) {
    return null;
  }

  // Promo percentages are computed against the price actually charged at the
  // outlet (priceOverride when set), matching order.service pricing.
  const basePrice = unitPrice;

  let totalDiscountAmount = 0;
  let representativePromo: ProductAppliedPromo | null = null;

  for (const promo of matchedPromos) {
    const discountAmount = calculatePromoDiscountAmount(
      basePrice,
      promo.discountType,
      promo.discountValue,
    );

    totalDiscountAmount += discountAmount;

    const mappedPromo: ProductAppliedPromo = {
      id: promo.id,
      name: promo.name,
      targetType: promo.targetType,
      targetValue: resolvePromoTargetValue(promo),
      discountType: promo.discountType,
      discountValue: toDecimalString(promo.discountValue),
      discountAmount,
    };

    // Keep the single largest promo as the representative label (ties broken by
    // name); the reported discountAmount below is the stacked total.
    if (
      !representativePromo ||
      mappedPromo.discountAmount > representativePromo.discountAmount ||
      (mappedPromo.discountAmount === representativePromo.discountAmount &&
        mappedPromo.name.localeCompare(representativePromo.name) < 0)
    ) {
      representativePromo = mappedPromo;
    }
  }

  // Cap the stacked discount at the base price so effectivePrice never goes
  // below zero and effectivePrice + discount === basePrice still holds.
  const cappedDiscount = totalDiscountAmount > basePrice ? basePrice : totalDiscountAmount;

  return { ...(representativePromo as ProductAppliedPromo), discountAmount: cappedDiscount };
}

function mapProductListItem(
  product: ProductWithCategory,
  appliedPromo: ProductAppliedPromo | null,
  outletPrice: number,
): ProductListItem {
  const basePrice = toNumber(product.basePrice);
  const promoDiscountAmount = appliedPromo?.discountAmount ?? 0;
  const promoPrice = Math.max(outletPrice - promoDiscountAmount, 0);

  return {
    id: product.id,
    businessId: product.businessId,
    categoryId: product.categoryId,
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
    effectivePrice: promoPrice,
    promoPrice,
    promoDiscountAmount,
    appliedPromo,
    status: product.status,
    category: product.category,
  };
}

export async function listProducts(
  businessId: string,
  query: ProductListQuery,
) {
  if (query.categoryId) {
    await ensureCategoryExists(businessId, query.categoryId);
  }

  const outletId = sanitizeOutletId(query.outletId);
  await ensureOutletExistsInBusiness(businessId, outletId);

  const search = sanitizeSearch(query.search);

  const where: Prisma.ProductWhereInput = {
    businessId,
    ...(query.status
      ? {
          status: query.status as ProductStatus,
        }
      : {}),
    ...(query.categoryId
      ? {
          categoryId: query.categoryId,
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              code: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              sku: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              barcode: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              brand: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              unit: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
    // Outlet-scoped listing (POS) hides products disabled or marked
    // unavailable at that outlet so the cashier cannot add them to the cart.
    ...(outletId
      ? {
          NOT: {
            productOutletSettings: {
              some: {
                outletId,
                OR: [
                  { status: { not: ProductOutletStatus.ACTIVE } },
                  { isAvailable: false },
                ],
              },
            },
          },
        }
      : {}),
  };

  const skip = (query.page - 1) * query.perPage;

  const [items, total, activePromos] = await Promise.all([
    prisma.product.findMany({
      where,
      skip,
      take: query.perPage,
      include: {
        category: true,
      },
      orderBy: [{ name: 'asc' }],
    }),
    prisma.product.count({ where }),
    getActivePromosForProducts(businessId, outletId),
  ]);

  const outletPriceOverrides = new Map<string, number>();

  if (outletId && items.length > 0) {
    const outletSettings = await prisma.productOutletSetting.findMany({
      where: {
        outletId,
        productId: { in: items.map((item) => item.id) },
        priceOverride: { not: null },
      },
      select: {
        productId: true,
        priceOverride: true,
      },
    });

    for (const setting of outletSettings) {
      if (setting.priceOverride !== null) {
        outletPriceOverrides.set(setting.productId, toNumber(setting.priceOverride));
      }
    }
  }

  const mappedItems = items.map((item) => {
    const outletPrice =
      outletPriceOverrides.get(item.id) ?? toNumber(item.basePrice);

    return mapProductListItem(
      item,
      resolveBestPromoForProduct(item, activePromos, outletPrice),
      outletPrice,
    );
  });

  return {
    items: mappedItems,
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage) || 1,
    },
  };
}

export async function getProductDetail(
  businessId: string,
  params: ProductParams,
) {
  return ensureProductExists(businessId, params.id);
}

export async function createProduct(
  businessId: string,
  payload: CreateProductBody,
) {
  await enforceProductLimit({
    businessId,
    blockedAction: 'CREATE_PRODUCT',
  });

  const business = await getBusinessOrThrow(businessId);
  const normalizedName = normalizeName(payload.name);
  const normalizedSku = normalizeSku(payload.sku);
  const normalizedBarcode = normalizeBarcode(payload.barcode);
  const generatedCode = await generateProductCode(
    businessId,
    business.businessType,
    normalizedName,
  );
  const normalizedCode = normalizeCode(generatedCode) ?? '';

  await ensureCategoryExists(businessId, payload.categoryId);
  await ensureProductNameUnique(businessId, normalizedName);
  await ensureProductCodeUnique(businessId, normalizedCode);
  await ensureProductSkuUnique(businessId, normalizedSku);
  await ensureProductBarcodeUnique(businessId, normalizedBarcode);

  return prisma.product.create({
    data: {
      businessId,
      categoryId: payload.categoryId ?? null,
      name: normalizedName,
      code: normalizedCode,
      sku: normalizedSku,
      barcode: normalizedBarcode,
      brand: normalizeNullableText(payload.brand),
      unit: normalizeNullableText(payload.unit),
      description: normalizeNullableText(payload.description),
      imageUrl: normalizeNullableText(payload.imageUrl),
      basePrice: payload.basePrice,
    },
    include: {
      category: true,
    },
  });
}

export async function updateProduct(
  businessId: string,
  params: ProductParams,
  payload: UpdateProductBody,
) {
  const currentProduct = await ensureProductExists(businessId, params.id);

  const normalizedName = normalizeName(payload.name);
  const normalizedSku = normalizeSku(payload.sku);
  const normalizedBarcode = normalizeBarcode(payload.barcode);

  await ensureCategoryExists(businessId, payload.categoryId);
  await ensureProductNameUnique(businessId, normalizedName, params.id);
  await ensureProductSkuUnique(businessId, normalizedSku, params.id);
  await ensureProductBarcodeUnique(businessId, normalizedBarcode, params.id);

  return prisma.product.update({
    where: {
      id: currentProduct.id,
    },
    data: {
      categoryId: payload.categoryId ?? null,
      name: normalizedName,
      sku: normalizedSku,
      barcode: normalizedBarcode,
      brand: normalizeNullableText(payload.brand),
      unit: normalizeNullableText(payload.unit),
      description: normalizeNullableText(payload.description),
      imageUrl: normalizeNullableText(payload.imageUrl),
      basePrice: payload.basePrice,
    },
    include: {
      category: true,
    },
  });
}

export async function updateProductStatus(
  businessId: string,
  params: ProductParams,
  payload: UpdateProductStatusBody,
) {
  const currentProduct = await ensureProductExists(businessId, params.id);

  if (
    currentProduct.status !== ProductStatus.ACTIVE &&
    payload.status === ProductStatus.ACTIVE
  ) {
    await enforceProductLimit({
      businessId,
      blockedAction: 'ACTIVATE_PRODUCT',
    });
  }

  return prisma.product.update({
    where: {
      id: params.id,
    },
    data: {
      status: payload.status,
    },
    include: {
      category: true,
    },
  });
}

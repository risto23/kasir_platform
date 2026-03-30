import { Prisma, ProductStatus, BusinessType } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  ProductListQuery,
  ProductParams,
  CreateProductBody,
  UpdateProductBody,
  UpdateProductStatusBody,
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

export async function listProducts(
  businessId: string,
  query: ProductListQuery,
) {
  if (query.categoryId) {
    await ensureCategoryExists(businessId, query.categoryId);
  }

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
  };

  const skip = (query.page - 1) * query.perPage;

  const [items, total] = await Promise.all([
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
  ]);

  return {
    items,
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
  const business = await getBusinessOrThrow(businessId);
  const normalizedName = normalizeName(payload.name);
  const normalizedSku = normalizeSku(payload.sku);
  const normalizedBarcode = normalizeBarcode(payload.barcode);
  const generatedCode = await generateProductCode(
    businessId,
    business.businessType,
    normalizedName,
  );
  const normalizedCode = normalizeCode(generatedCode);

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
  await ensureProductExists(businessId, params.id);

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
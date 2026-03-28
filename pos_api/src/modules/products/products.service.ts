import { Prisma, ProductStatus } from '@prisma/client';
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
  });

  if (existing) {
    throw createHttpError('SKU product sudah digunakan di business ini.', 409);
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
  const normalizedName = normalizeName(payload.name);
  const normalizedCode = normalizeCode(payload.code);
  const normalizedSku = normalizeSku(payload.sku);

  await ensureCategoryExists(businessId, payload.categoryId);
  await ensureProductNameUnique(businessId, normalizedName);
  await ensureProductCodeUnique(businessId, normalizedCode);
  await ensureProductSkuUnique(businessId, normalizedSku);

  return prisma.product.create({
    data: {
      businessId,
      categoryId: payload.categoryId ?? null,
      name: normalizedName,
      code: normalizedCode,
      sku: normalizedSku,
      description: payload.description ?? null,
      imageUrl: payload.imageUrl ?? null,
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
  await ensureProductExists(businessId, params.id);

  const normalizedName = normalizeName(payload.name);
  const normalizedCode = normalizeCode(payload.code);
  const normalizedSku = normalizeSku(payload.sku);

  await ensureCategoryExists(businessId, payload.categoryId);
  await ensureProductNameUnique(businessId, normalizedName, params.id);
  await ensureProductCodeUnique(businessId, normalizedCode, params.id);
  await ensureProductSkuUnique(businessId, normalizedSku, params.id);

  return prisma.product.update({
    where: {
      id: params.id,
    },
    data: {
      categoryId: payload.categoryId ?? null,
      name: normalizedName,
      code: normalizedCode,
      sku: normalizedSku,
      description: payload.description ?? null,
      imageUrl: payload.imageUrl ?? null,
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
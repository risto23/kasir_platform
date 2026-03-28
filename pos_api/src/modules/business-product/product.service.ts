// pos_api/src/modules/business-product/product.service.ts
import { Prisma, ProductStatus } from '@prisma/client';

import {prisma} from '../../config/prisma';
import {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from './product.types';
import { mapProduct } from './product.mapper';

function buildProductCode(name: string) {
  const cleaned = name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

  return `PRD-${cleaned || 'ITEM'}`;
}

async function generateUniqueProductCode(
  tx: Prisma.TransactionClient,
  businessId: string,
  name: string,
  excludeProductId?: string,
) {
  const baseCode = buildProductCode(name);

  for (let index = 0; index < 1000; index += 1) {
    const candidate = index === 0 ? baseCode : `${baseCode}-${index + 1}`;

    const existing = await tx.product.findFirst({
      where: {
        businessId,
        code: candidate,
        ...(excludeProductId
          ? {
              NOT: {
                id: excludeProductId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return candidate;
    }
  }

  throw new Error('Gagal membuat code product yang unik');
}

async function validateCategoryBelongsToBusiness(
  tx: Prisma.TransactionClient,
  businessId: string,
  categoryId?: string | null,
) {
  if (!categoryId) {
    return;
  }

  const category = await tx.category.findFirst({
    where: {
      id: categoryId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!category) {
    throw new Error('Category tidak ditemukan pada business aktif');
  }
}

async function ensureUniqueSku(
  tx: Prisma.TransactionClient,
  businessId: string,
  sku?: string | null,
  excludeProductId?: string,
) {
  if (!sku) {
    return;
  }

  const existing = await tx.product.findFirst({
    where: {
      businessId,
      sku,
      ...(excludeProductId
        ? {
            NOT: {
              id: excludeProductId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error('SKU sudah digunakan pada business aktif');
  }
}

async function getProductOrThrow(tx: Prisma.TransactionClient, businessId: string, id: string) {
  const product = await tx.product.findFirst({
    where: {
      id,
      businessId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error('Product tidak ditemukan');
  }

  return product;
}

export async function getProductList(
  businessId: string,
  query: ProductListQuery,
) {
  const where: Prisma.ProductWhereInput = {
    businessId,
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.categoryId) {
    where.categoryId = query.categoryId;
  }

  if (query.search) {
    where.OR = [
      {
        name: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        code: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        sku: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        brand: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        unit: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
    orderBy: [{ name: 'asc' }],
  });

  return products.map(mapProduct);
}

export async function getProductDetail(businessId: string, id: string) {
  const product = await prisma.product.findFirst({
    where: {
      id,
      businessId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!product) {
    throw new Error('Product tidak ditemukan');
  }

  return mapProduct(product);
}

export async function createProduct(
  businessId: string,
  input: CreateProductInput,
) {
  return prisma.$transaction(async (tx) => {
    await validateCategoryBelongsToBusiness(tx, businessId, input.categoryId);
    await ensureUniqueSku(tx, businessId, input.sku);

    const code = await generateUniqueProductCode(tx, businessId, input.name);

    const product = await tx.product.create({
      data: {
        businessId,
        categoryId: input.categoryId || null,
        name: input.name.trim(),
        code,
        sku: input.sku || null,
        brand: input.brand || null,
        unit: input.unit || null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        basePrice: new Prisma.Decimal(input.basePrice),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return mapProduct(product);
  });
}

export async function updateProduct(
  businessId: string,
  id: string,
  input: UpdateProductInput,
) {
  return prisma.$transaction(async (tx) => {
    await getProductOrThrow(tx, businessId, id);
    await validateCategoryBelongsToBusiness(tx, businessId, input.categoryId);
    await ensureUniqueSku(tx, businessId, input.sku, id);

    const code = await generateUniqueProductCode(tx, businessId, input.name, id);

    const product = await tx.product.update({
      where: { id },
      data: {
        categoryId: input.categoryId || null,
        name: input.name.trim(),
        code,
        sku: input.sku || null,
        brand: input.brand || null,
        unit: input.unit || null,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        basePrice: new Prisma.Decimal(input.basePrice),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return mapProduct(product);
  });
}

export async function updateProductStatus(
  businessId: string,
  id: string,
  status: ProductStatus,
) {
  return prisma.$transaction(async (tx) => {
    await getProductOrThrow(tx, businessId, id);

    const product = await tx.product.update({
      where: { id },
      data: { status },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return mapProduct(product);
  });
}
import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  CreateSupplierProductBody,
  ListSupplierProductsInput,
  SupplierProductItemDto,
  UpdateSupplierProductBody,
} from './supplier-products.types';

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function toMoneyString(value: Prisma.Decimal | null | undefined) {
  if (!value) {
    return null;
  }

  return value.toFixed(2);
}

function toQuantityString(value: Prisma.Decimal | null | undefined) {
  if (!value) {
    return null;
  }

  return value.toFixed(3);
}

function normalizeSearch(search?: string) {
  const trimmed = search?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeNullableText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

async function ensureSupplierExists(
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
    },
  });

  if (!supplier) {
    throw createHttpError('Supplier tidak ditemukan.', 404);
  }

  return supplier;
}

async function ensureProductExists(
  tx: Prisma.TransactionClient,
  businessId: string,
  productId: string,
) {
  const product = await tx.product.findFirst({
    where: {
      id: productId,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!product) {
    throw createHttpError('Product tidak ditemukan.', 404);
  }

  return product;
}

async function ensureMappingExists(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    supplierId: string;
    mappingId: string;
  },
) {
  const mapping = await tx.supplierProduct.findFirst({
    where: {
      id: params.mappingId,
      businessId: params.businessId,
      supplierId: params.supplierId,
    },
    select: {
      id: true,
      productId: true,
    },
  });

  if (!mapping) {
    throw createHttpError('Mapping supplier-product tidak ditemukan.', 404);
  }

  return mapping;
}

async function ensureSupplierProductUnique(
  tx: Prisma.TransactionClient,
  params: {
    supplierId: string;
    productId: string;
    excludeId?: string;
  },
) {
  const existing = await tx.supplierProduct.findFirst({
    where: {
      supplierId: params.supplierId,
      productId: params.productId,
      ...(params.excludeId
        ? {
            id: {
              not: params.excludeId,
            },
          }
        : {}),
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('Product ini sudah dimapping ke supplier tersebut.', 409);
  }
}

async function syncPrimarySupplier(
  tx: Prisma.TransactionClient,
  params: {
    businessId: string;
    productId: string;
    activeMappingId: string;
    isPrimarySupplier: boolean;
  },
) {
  if (!params.isPrimarySupplier) {
    return;
  }

  await tx.supplierProduct.updateMany({
    where: {
      businessId: params.businessId,
      productId: params.productId,
      id: {
        not: params.activeMappingId,
      },
    },
    data: {
      isPrimarySupplier: false,
    },
  });
}

function mapSupplierProduct(item: {
  id: string;
  businessId: string;
  supplierId: string;
  productId: string;
  supplierSku: string | null;
  lastPurchasePrice: Prisma.Decimal | null;
  minimumOrderQty: Prisma.Decimal | null;
  isPrimarySupplier: boolean;
  createdAt: Date;
  updatedAt: Date;
  product: {
    name: string;
    code: string | null;
    sku: string | null;
    barcode: string | null;
    unit: string | null;
    status: string;
  };
}): SupplierProductItemDto {
  return {
    id: item.id,
    businessId: item.businessId,
    supplierId: item.supplierId,
    productId: item.productId,
    supplierSku: item.supplierSku,
    lastPurchasePrice: toMoneyString(item.lastPurchasePrice),
    minimumOrderQty: toQuantityString(item.minimumOrderQty),
    isPrimarySupplier: item.isPrimarySupplier,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    productName: item.product.name,
    productCode: item.product.code,
    productSku: item.product.sku,
    productBarcode: item.product.barcode,
    productUnit: item.product.unit,
    productStatus: item.product.status,
  };
}

function buildMutationData(
  businessId: string,
  supplierId: string,
  payload: CreateSupplierProductBody | UpdateSupplierProductBody,
) {
  return {
    businessId,
    supplierId,
    productId: payload.productId,
    supplierSku: normalizeNullableText(payload.supplierSku),
    lastPurchasePrice:
      payload.lastPurchasePrice !== undefined
        ? new Prisma.Decimal(payload.lastPurchasePrice)
        : null,
    minimumOrderQty:
      payload.minimumOrderQty !== undefined
        ? new Prisma.Decimal(payload.minimumOrderQty)
        : null,
    isPrimarySupplier: payload.isPrimarySupplier ?? false,
  };
}

export async function listSupplierProducts(input: ListSupplierProductsInput) {
  const search = normalizeSearch(input.search);

  const where: Prisma.SupplierProductWhereInput = {
    businessId: input.businessId,
    supplierId: input.supplierId,
    ...(search
      ? {
          OR: [
            {
              supplierSku: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              product: {
                name: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              product: {
                code: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              product: {
                sku: {
                  contains: search,
                  mode: 'insensitive',
                },
              },
            },
            {
              product: {
                barcode: {
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

  const [items, total] = await Promise.all([
    prisma.supplierProduct.findMany({
      where,
      include: {
        product: {
          select: {
            name: true,
            code: true,
            sku: true,
            barcode: true,
            unit: true,
            status: true,
          },
        },
      },
      orderBy: [{ isPrimarySupplier: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: input.perPage,
    }),
    prisma.supplierProduct.count({ where }),
  ]);

  return {
    items: items.map(mapSupplierProduct),
    meta: {
      page: input.page,
      perPage: input.perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.perPage)),
    },
  };
}

export async function createSupplierProduct(params: {
  businessId: string;
  supplierId: string;
  payload: CreateSupplierProductBody;
}) {
  return prisma.$transaction(async (tx) => {
    await ensureSupplierExists(tx, params.businessId, params.supplierId);
    await ensureProductExists(tx, params.businessId, params.payload.productId);
    await ensureSupplierProductUnique(tx, {
      supplierId: params.supplierId,
      productId: params.payload.productId,
    });

    const created = await tx.supplierProduct.create({
      data: buildMutationData(
        params.businessId,
        params.supplierId,
        params.payload,
      ),
      include: {
        product: {
          select: {
            name: true,
            code: true,
            sku: true,
            barcode: true,
            unit: true,
            status: true,
          },
        },
      },
    });

    await syncPrimarySupplier(tx, {
      businessId: params.businessId,
      productId: created.productId,
      activeMappingId: created.id,
      isPrimarySupplier: created.isPrimarySupplier,
    });

    return mapSupplierProduct(created);
  });
}

export async function updateSupplierProduct(params: {
  businessId: string;
  supplierId: string;
  mappingId: string;
  payload: UpdateSupplierProductBody;
}) {
  return prisma.$transaction(async (tx) => {
    await ensureSupplierExists(tx, params.businessId, params.supplierId);
    await ensureMappingExists(tx, {
      businessId: params.businessId,
      supplierId: params.supplierId,
      mappingId: params.mappingId,
    });
    await ensureProductExists(tx, params.businessId, params.payload.productId);
    await ensureSupplierProductUnique(tx, {
      supplierId: params.supplierId,
      productId: params.payload.productId,
      excludeId: params.mappingId,
    });

    const updated = await tx.supplierProduct.update({
      where: {
        id: params.mappingId,
      },
      data: buildMutationData(
        params.businessId,
        params.supplierId,
        params.payload,
      ),
      include: {
        product: {
          select: {
            name: true,
            code: true,
            sku: true,
            barcode: true,
            unit: true,
            status: true,
          },
        },
      },
    });

    await syncPrimarySupplier(tx, {
      businessId: params.businessId,
      productId: updated.productId,
      activeMappingId: updated.id,
      isPrimarySupplier: updated.isPrimarySupplier,
    });

    return mapSupplierProduct(updated);
  });
}

export async function deleteSupplierProduct(params: {
  businessId: string;
  supplierId: string;
  mappingId: string;
}) {
  return prisma.$transaction(async (tx) => {
    await ensureSupplierExists(tx, params.businessId, params.supplierId);
    const existing = await ensureMappingExists(tx, {
      businessId: params.businessId,
      supplierId: params.supplierId,
      mappingId: params.mappingId,
    });

    await tx.supplierProduct.delete({
      where: {
        id: existing.id,
      },
    });

    return {
      id: existing.id,
    };
  });
}

import { Prisma, ProductOutletStatus } from '@prisma/client';

import {prisma} from '../../config/prisma';

import type {
  ProductOutletSettingListItem,
  ProductOutletSettingsListQuery,
  ProductOutletSettingsListResponse,
  UpdateProductOutletSettingInput,
} from './product-outlet-settings.types';

class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function decimalToNumber(value: Prisma.Decimal | number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'number') {
    return value;
  }

  return value.toNumber();
}

function mapItem(item: {
  id: string;
  productId: string;
  outletId: string;
  status: ProductOutletStatus;
  isAvailable: boolean;
  priceOverride: Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
  product: {
    id: string;
    name: string;
    code: string | null;
    sku: string | null;
    basePrice: Prisma.Decimal;
    status: string;
    category: {
      id: string;
      name: string;
      code: string | null;
    } | null;
  };
  outlet: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
}): ProductOutletSettingListItem {
  return {
    id: item.id,
    productId: item.productId,
    outletId: item.outletId,
    status: item.status,
    isAvailable: item.isAvailable,
    priceOverride: decimalToNumber(item.priceOverride),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    product: {
      id: item.product.id,
      name: item.product.name,
      code: item.product.code,
      sku: item.product.sku,
      basePrice: decimalToNumber(item.product.basePrice) ?? 0,
      status: item.product.status,
      category: item.product.category
        ? {
            id: item.product.category.id,
            name: item.product.category.name,
            code: item.product.category.code,
          }
        : null,
    },
    outlet: {
      id: item.outlet.id,
      name: item.outlet.name,
      code: item.outlet.code,
      status: item.outlet.status,
    },
  };
}

async function ensureProductBelongsToBusiness(businessId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      businessId,
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      basePrice: true,
      status: true,
    },
  });

  if (!product) {
    throw new HttpError(404, 'Product tidak ditemukan pada business aktif.');
  }

  return product;
}

async function ensureOutletBelongsToBusiness(businessId: string, outletId: string) {
  const outlet = await prisma.outlet.findFirst({
    where: {
      id: outletId,
      businessId,
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      code: true,
      status: true,
    },
  });

  if (!outlet) {
    throw new HttpError(404, 'Outlet tidak ditemukan pada business aktif.');
  }

  return outlet;
}

export async function listProductOutletSettings(
  businessId: string,
  query: ProductOutletSettingsListQuery,
): Promise<ProductOutletSettingsListResponse> {
  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  if (query.productId) {
    await ensureProductBelongsToBusiness(businessId, query.productId);
  }

  if (query.outletId) {
    await ensureOutletBelongsToBusiness(businessId, query.outletId);
  }

  const where: Prisma.ProductOutletSettingWhereInput = {
    product: {
      businessId,
    },
    outlet: {
      businessId,
    },
  };

  if (query.productId) {
    where.productId = query.productId;
  }

  if (query.outletId) {
    where.outletId = query.outletId;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.isAvailable !== undefined) {
    where.isAvailable = query.isAvailable;
  }

  if (query.search) {
    where.OR = [
      {
        product: {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      },
      {
        product: {
          code: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      },
      {
        product: {
          sku: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      },
      {
        outlet: {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      },
      {
        outlet: {
          code: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.productOutletSetting.count({ where }),
    prisma.productOutletSetting.findMany({
      where,
      skip,
      take: limit,
      orderBy: [
        {
          product: {
            name: 'asc',
          },
        },
        {
          outlet: {
            name: 'asc',
          },
        },
      ],
      include: {
        product: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        },
        outlet: {
          select: {
            id: true,
            name: true,
            code: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return {
    items: rows.map(mapItem),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function getProductOutletSettingsByProductId(
  businessId: string,
  productId: string,
): Promise<ProductOutletSettingsListResponse> {
  await ensureProductBelongsToBusiness(businessId, productId);

  return listProductOutletSettings(businessId, {
    page: 1,
    limit: 100,
    productId,
  });
}

export async function updateProductOutletSetting(
  businessId: string,
  productId: string,
  outletId: string,
  payload: UpdateProductOutletSettingInput,
) {
  await ensureProductBelongsToBusiness(businessId, productId);
  await ensureOutletBelongsToBusiness(businessId, outletId);

  const existing = await prisma.productOutletSetting.findUnique({
    where: {
      productId_outletId: {
        productId,
        outletId,
      },
    },
  });

  const data: Prisma.ProductOutletSettingUncheckedCreateInput &
    Prisma.ProductOutletSettingUncheckedUpdateInput = {
    productId,
    outletId,
    status: payload.status ?? existing?.status ?? ProductOutletStatus.ACTIVE,
    isAvailable: payload.isAvailable ?? existing?.isAvailable ?? true,
  };

  if (payload.priceOverride !== undefined) {
    data.priceOverride =
      payload.priceOverride === null
        ? null
        : new Prisma.Decimal(payload.priceOverride);
  } else if (!existing) {
    data.priceOverride = null;
  }

  const row = await prisma.productOutletSetting.upsert({
    where: {
      productId_outletId: {
        productId,
        outletId,
      },
    },
    update: data,
    create: data,
    include: {
      product: {
        include: {
          category: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      },
      outlet: {
        select: {
          id: true,
          name: true,
          code: true,
          status: true,
        },
      },
    },
  });

  return mapItem(row);
}
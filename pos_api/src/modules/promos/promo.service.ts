import {
  Prisma,
  PromoDiscountType,
  PromoOutletScope,
  PromoStatus,
  PromoTargetType,
} from '@prisma/client';
import { prisma } from '../../config/prisma';
import {
  buildPromoTargetLabel,
  buildPromoTargetValue,
  formatDateOnly,
  mapDiscountPreview,
  normalizeDateOnlyInput,
  resolvePromoEffectiveStatus,
} from './promo.utils';
import type {
  ListPromoParams,
  PromoBody,
  PromoMappedItem,
  PromoOutletItem,
} from './promo.types';

const TEXT_BASED_PROMO_TARGET_TYPES: PromoTargetType[] = [
  PromoTargetType.PRODUCT_NAME,
  PromoTargetType.BRAND,
  PromoTargetType.UNIT,
];

function isTextBasedPromoTargetType(targetType: PromoTargetType): boolean {
  return TEXT_BASED_PROMO_TARGET_TYPES.includes(targetType);
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

function normalizeSelectedOutletIds(outletIds: string[]): string[] {
  return Array.from(
    new Set(
      outletIds
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    ),
  );
}

async function validatePromoTargetOwnership(
  businessId: string,
  payload: PromoBody,
) {
  if (payload.targetType === PromoTargetType.CATEGORY && payload.categoryId) {
    const category = await prisma.category.findFirst({
      where: {
        id: payload.categoryId,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!category) {
      throw new Error('Kategori target tidak ditemukan dalam business aktif');
    }
  }

  if (payload.targetType === PromoTargetType.PRODUCT && payload.productId) {
    const product = await prisma.product.findFirst({
      where: {
        id: payload.productId,
        businessId,
      },
      select: {
        id: true,
      },
    });

    if (!product) {
      throw new Error('Produk target tidak ditemukan dalam business aktif');
    }
  }
}

async function validateSelectedOutlets(
  businessId: string,
  outletScope: PromoOutletScope,
  selectedOutletIds: string[],
): Promise<string[]> {
  if (outletScope === PromoOutletScope.ALL_OUTLETS) {
    return [];
  }

  const normalizedIds = normalizeSelectedOutletIds(selectedOutletIds);

  if (normalizedIds.length === 0) {
    throw new Error(
      'selectedOutletIds wajib diisi minimal 1 outlet untuk SELECTED_OUTLETS',
    );
  }

  const outlets = await prisma.outlet.findMany({
    where: {
      id: {
        in: normalizedIds,
      },
      businessId,
      status: 'ACTIVE',
    },
    select: {
      id: true,
    },
  });

  if (outlets.length !== normalizedIds.length) {
    throw new Error(
      'Semua outlet promo harus aktif dan milik business yang sama',
    );
  }

  return normalizedIds;
}

type PromoRecord = {
  id: string;
  businessId: string;
  name: string;
  description: string | null;
  targetType: PromoTargetType;
  categoryId: string | null;
  productId: string | null;
  targetTextValue: string | null;
  discountType: PromoDiscountType;
  discountValue: Prisma.Decimal | null;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  status: PromoStatus;
  outletScope: PromoOutletScope | null;
  createdAt: Date;
  updatedAt: Date;
  category?: { id: string; name: string } | null;
  product?: { id: string; name: string } | null;
  promoOutlets?: Array<{
    id: string;
    outletId: string;
    outlet: {
      id: string;
      name: string;
      code: string;
    };
  }>;
};

function mapSelectedOutlets(
  promoOutlets?: Array<{
    id: string;
    outletId: string;
    outlet: {
      id: string;
      name: string;
      code: string;
    };
  }>,
): PromoOutletItem[] {
  if (!promoOutlets || promoOutlets.length === 0) {
    return [];
  }

  return promoOutlets.map((item) => ({
    id: item.id,
    outletId: item.outletId,
    outletName: item.outlet.name,
    outletCode: item.outlet.code,
  }));
}

function mapPromoRecord(promo: PromoRecord): PromoMappedItem {
  const effectiveStatus = resolvePromoEffectiveStatus({
    startDate: promo.startDate,
    endDate: promo.endDate,
    startTime: promo.startTime,
    endTime: promo.endTime,
    status: promo.status,
  });

  const discountValue = toDecimalString(promo.discountValue);
  const selectedOutlets = mapSelectedOutlets(promo.promoOutlets);
  const outletScope = promo.outletScope ?? PromoOutletScope.ALL_OUTLETS;

  return {
    id: promo.id,
    businessId: promo.businessId,
    name: promo.name,
    description: promo.description,
    targetType: promo.targetType,
    categoryId: promo.categoryId,
    productId: promo.productId,
    targetTextValue: promo.targetTextValue,
    targetLabel: buildPromoTargetLabel({
      targetType: promo.targetType,
      categoryName: promo.category?.name,
      productName: promo.product?.name,
      targetTextValue: promo.targetTextValue,
    }),
    targetValue: buildPromoTargetValue({
      targetType: promo.targetType,
      categoryId: promo.categoryId,
      productId: promo.productId,
      targetTextValue: promo.targetTextValue,
    }),
    discountType: promo.discountType,
    discountValue,
    discountPreview: mapDiscountPreview(promo.discountType, discountValue),
    startDate: formatDateOnly(promo.startDate),
    endDate: formatDateOnly(promo.endDate),
    startTime: promo.startTime,
    endTime: promo.endTime,
    status: promo.status,
    effectiveStatus,
    outletScope,
    selectedOutletCount: selectedOutlets.length,
    selectedOutlets,
    createdAt: promo.createdAt,
    updatedAt: promo.updatedAt,
  };
}

export async function getPromoFormMeta(businessId: string) {
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
    throw new Error('Business aktif tidak ditemukan');
  }

  const [categories, products, outlets] = await Promise.all([
    prisma.category.findMany({
      where: {
        businessId,
      },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        status: true,
      },
    }),
    prisma.product.findMany({
      where: {
        businessId,
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        brand: true,
        unit: true,
        status: true,
      },
    }),
    prisma.outlet.findMany({
      where: {
        businessId,
        status: 'ACTIVE',
      },
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
    }),
  ]);

  return {
    businessType: business.businessType,
    targetTypes: [
      PromoTargetType.CATEGORY,
      PromoTargetType.PRODUCT,
      PromoTargetType.PRODUCT_NAME,
      PromoTargetType.BRAND,
      PromoTargetType.UNIT,
    ],
    discountTypes: [
      PromoDiscountType.PERCENTAGE,
      PromoDiscountType.FIXED_AMOUNT,
    ],
    statuses: [PromoStatus.ACTIVE, PromoStatus.INACTIVE],
    outletScopes: [
      PromoOutletScope.ALL_OUTLETS,
      PromoOutletScope.SELECTED_OUTLETS,
    ],
    categories,
    products,
    outlets,
  };
}

export async function listPromos(params: ListPromoParams) {
  const promos = await prisma.promo.findMany({
    where: {
      businessId: params.businessId,
      ...(params.targetType ? { targetType: params.targetType } : {}),
      ...(params.status ? { status: params.status } : {}),
      ...(params.outletScope ? { outletScope: params.outletScope } : {}),
      ...(params.search
        ? {
            OR: [
              {
                name: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                description: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                targetTextValue: {
                  contains: params.search,
                  mode: 'insensitive',
                },
              },
              {
                category: {
                  name: {
                    contains: params.search,
                    mode: 'insensitive',
                  },
                },
              },
              {
                product: {
                  name: {
                    contains: params.search,
                    mode: 'insensitive',
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      promoOutlets: {
        include: {
          outlet: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          {
            outlet: {
              name: 'asc',
            },
          },
        ],
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const mapped = promos.map((promo) =>
    mapPromoRecord({
      ...promo,
      discountValue: promo.discountValue ?? null,
      outletScope: promo.outletScope ?? PromoOutletScope.ALL_OUTLETS,
    }),
  );

  if (!params.effectiveStatus) {
    return mapped;
  }

  return mapped.filter((item) => item.effectiveStatus === params.effectiveStatus);
}

export async function getPromoById(businessId: string, id: string) {
  const promo = await prisma.promo.findFirst({
    where: {
      id,
      businessId,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      promoOutlets: {
        include: {
          outlet: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          {
            outlet: {
              name: 'asc',
            },
          },
        ],
      },
    },
  });

  if (!promo) {
    throw new Error('Promo tidak ditemukan');
  }

  return mapPromoRecord({
    ...promo,
    discountValue: promo.discountValue ?? null,
    outletScope: promo.outletScope ?? PromoOutletScope.ALL_OUTLETS,
  });
}

export async function createPromo(businessId: string, payload: PromoBody) {
  await validatePromoTargetOwnership(businessId, payload);

  const validatedSelectedOutletIds = await validateSelectedOutlets(
    businessId,
    payload.outletScope,
    payload.selectedOutletIds,
  );

  const promo = await prisma.$transaction(async (tx) => {
    const createdPromo = await tx.promo.create({
      data: {
        businessId,
        name: payload.name,
        description: payload.description ?? null,
        targetType: payload.targetType,
        categoryId:
          payload.targetType === PromoTargetType.CATEGORY
            ? payload.categoryId ?? null
            : null,
        productId:
          payload.targetType === PromoTargetType.PRODUCT
            ? payload.productId ?? null
            : null,
        targetTextValue: isTextBasedPromoTargetType(payload.targetType)
          ? payload.targetTextValue ?? null
          : null,
        discountType: payload.discountType,
        discountValue: new Prisma.Decimal(payload.discountValue),
        startDate: normalizeDateOnlyInput(payload.startDate),
        endDate: normalizeDateOnlyInput(payload.endDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: payload.status ?? PromoStatus.ACTIVE,
        outletScope: payload.outletScope,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (
      payload.outletScope === PromoOutletScope.SELECTED_OUTLETS &&
      validatedSelectedOutletIds.length > 0
    ) {
      await tx.promoOutlet.createMany({
        data: validatedSelectedOutletIds.map((outletId) => ({
          promoId: createdPromo.id,
          outletId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.promo.findFirst({
      where: {
        id: createdPromo.id,
        businessId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        promoOutlets: {
          include: {
            outlet: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: [
            {
              outlet: {
                name: 'asc',
              },
            },
          ],
        },
      },
    });
  });

  if (!promo) {
    throw new Error('Promo gagal dibuat');
  }

  return mapPromoRecord({
    ...promo,
    discountValue: promo.discountValue ?? null,
    outletScope: promo.outletScope ?? PromoOutletScope.ALL_OUTLETS,
  });
}

export async function updatePromo(
  businessId: string,
  id: string,
  payload: PromoBody,
) {
  const existing = await prisma.promo.findFirst({
    where: {
      id,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error('Promo tidak ditemukan');
  }

  await validatePromoTargetOwnership(businessId, payload);

  const validatedSelectedOutletIds = await validateSelectedOutlets(
    businessId,
    payload.outletScope,
    payload.selectedOutletIds,
  );

  const promo = await prisma.$transaction(async (tx) => {
    await tx.promo.update({
      where: {
        id,
      },
      data: {
        name: payload.name,
        description: payload.description ?? null,
        targetType: payload.targetType,
        categoryId:
          payload.targetType === PromoTargetType.CATEGORY
            ? payload.categoryId ?? null
            : null,
        productId:
          payload.targetType === PromoTargetType.PRODUCT
            ? payload.productId ?? null
            : null,
        targetTextValue: isTextBasedPromoTargetType(payload.targetType)
          ? payload.targetTextValue ?? null
          : null,
        discountType: payload.discountType,
        discountValue: new Prisma.Decimal(payload.discountValue),
        startDate: normalizeDateOnlyInput(payload.startDate),
        endDate: normalizeDateOnlyInput(payload.endDate),
        startTime: payload.startTime,
        endTime: payload.endTime,
        status: payload.status ?? PromoStatus.ACTIVE,
        outletScope: payload.outletScope,
      },
    });

    await tx.promoOutlet.deleteMany({
      where: {
        promoId: id,
      },
    });

    if (
      payload.outletScope === PromoOutletScope.SELECTED_OUTLETS &&
      validatedSelectedOutletIds.length > 0
    ) {
      await tx.promoOutlet.createMany({
        data: validatedSelectedOutletIds.map((outletId) => ({
          promoId: id,
          outletId,
        })),
        skipDuplicates: true,
      });
    }

    return tx.promo.findFirst({
      where: {
        id,
        businessId,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        promoOutlets: {
          include: {
            outlet: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
          orderBy: [
            {
              outlet: {
                name: 'asc',
              },
            },
          ],
        },
      },
    });
  });

  if (!promo) {
    throw new Error('Promo gagal diubah');
  }

  return mapPromoRecord({
    ...promo,
    discountValue: promo.discountValue ?? null,
    outletScope: promo.outletScope ?? PromoOutletScope.ALL_OUTLETS,
  });
}

export async function updatePromoStatus(
  businessId: string,
  id: string,
  status: PromoStatus,
) {
  const existing = await prisma.promo.findFirst({
    where: {
      id,
      businessId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error('Promo tidak ditemukan');
  }

  const promo = await prisma.promo.update({
    where: {
      id,
    },
    data: {
      status,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
        },
      },
      promoOutlets: {
        include: {
          outlet: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: [
          {
            outlet: {
              name: 'asc',
            },
          },
        ],
      },
    },
  });

  return mapPromoRecord({
    ...promo,
    discountValue: promo.discountValue ?? null,
    outletScope: promo.outletScope ?? PromoOutletScope.ALL_OUTLETS,
  });
}
import {
  Prisma,
  PromoDiscountType,
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
  type PromoEffectiveStatus,
} from './promo.utils';

type PromoPayload = {
  name: string;
  description?: string | null;
  targetType: PromoTargetType;
  categoryId?: string | null;
  productId?: string | null;
  targetTextValue?: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  status?: PromoStatus;
};

type ListPromoParams = {
  businessId: string;
  search?: string;
  targetType?: PromoTargetType;
  effectiveStatus?: PromoEffectiveStatus;
  status?: PromoStatus;
};

const TEXT_BASED_PROMO_TARGET_TYPES: PromoTargetType[] = [
  PromoTargetType.PRODUCT_NAME,
  PromoTargetType.BRAND,
  PromoTargetType.UNIT,
];

function isTextBasedPromoTargetType(
  targetType: PromoTargetType,
): boolean {
  return TEXT_BASED_PROMO_TARGET_TYPES.includes(targetType);
}

async function validatePromoTargetOwnership(
  businessId: string,
  payload: PromoPayload,
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

function mapPromoRecord(
  promo: {
    id: string;
    businessId: string;
    name: string;
    description: string | null;
    targetType: PromoTargetType;
    categoryId: string | null;
    productId: string | null;
    targetTextValue: string | null;
    discountType: PromoDiscountType;
    discountValue: Prisma.Decimal;
    startDate: Date;
    endDate: Date;
    startTime: string;
    endTime: string;
    status: PromoStatus;
    createdAt: Date;
    updatedAt: Date;
    category?: { id: string; name: string } | null;
    product?: { id: string; name: string } | null;
  },
) {
  const effectiveStatus = resolvePromoEffectiveStatus({
    startDate: promo.startDate,
    endDate: promo.endDate,
    startTime: promo.startTime,
    endTime: promo.endTime,
    status: promo.status,
  });

  const discountValue = promo.discountValue.toString();

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

  const [categories, products] = await Promise.all([
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
    categories,
    products,
  };
}

export async function listPromos(params: ListPromoParams) {
  const promos = await prisma.promo.findMany({
    where: {
      businessId: params.businessId,
      ...(params.targetType ? { targetType: params.targetType } : {}),
      ...(params.status ? { status: params.status } : {}),
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
    },
    orderBy: [{ createdAt: 'desc' }],
  });

  const mapped = promos.map(mapPromoRecord);

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
    },
  });

  if (!promo) {
    throw new Error('Promo tidak ditemukan');
  }

  return mapPromoRecord(promo);
}

export async function createPromo(businessId: string, payload: PromoPayload) {
  await validatePromoTargetOwnership(businessId, payload);

  const promo = await prisma.promo.create({
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

  return mapPromoRecord(promo);
}

export async function updatePromo(
  businessId: string,
  id: string,
  payload: PromoPayload,
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

  const promo = await prisma.promo.update({
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

  return mapPromoRecord(promo);
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
    },
  });

  return mapPromoRecord(promo);
}
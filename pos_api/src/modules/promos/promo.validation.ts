import {
  PromoDiscountType,
  PromoOutletScope,
  PromoStatus,
  PromoTargetType,
} from '@prisma/client';
import { z } from 'zod';

const idSchema = z.string().trim().min(1);
const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal wajib YYYY-MM-DD');
const timeSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Format jam wajib HH:mm');

const TEXT_BASED_PROMO_TARGET_TYPES: PromoTargetType[] = [
  PromoTargetType.PRODUCT_NAME,
  PromoTargetType.BRAND,
  PromoTargetType.UNIT,
];

function isTextBasedPromoTargetType(targetType: PromoTargetType): boolean {
  return TEXT_BASED_PROMO_TARGET_TYPES.includes(targetType);
}

const selectedOutletIdsSchema = z
  .array(idSchema)
  .optional()
  .transform((value) => {
    if (!value) {
      return [];
    }

    const uniqueIds = Array.from(new Set(value.map((item) => item.trim())));
    return uniqueIds.filter((item) => item.length > 0);
  });

const promoBodySchema = z
  .object({
    name: z.string().trim().min(1, 'Nama promo wajib diisi').max(120),
    description: z
      .string()
      .trim()
      .max(500, 'Deskripsi maksimal 500 karakter')
      .nullable()
      .optional(),
    targetType: z.nativeEnum(PromoTargetType),
    categoryId: idSchema.nullable().optional(),
    productId: idSchema.nullable().optional(),
    targetTextValue: z
      .string()
      .trim()
      .max(120, 'Nilai target maksimal 120 karakter')
      .nullable()
      .optional(),
    discountType: z.nativeEnum(PromoDiscountType),
    discountValue: z.coerce.number(),
    startDate: dateSchema,
    endDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    status: z.nativeEnum(PromoStatus).optional(),
    outletScope: z
      .nativeEnum(PromoOutletScope)
      .default(PromoOutletScope.ALL_OUTLETS),
    selectedOutletIds: selectedOutletIdsSchema,
  })
  .superRefine((value, ctx) => {
    if (value.discountValue <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Nilai diskon harus lebih dari 0',
      });
    }

    if (
      value.discountType === PromoDiscountType.PERCENTAGE &&
      value.discountValue > 100
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['discountValue'],
        message: 'Diskon persen maksimal 100',
      });
    }

    if (value.targetType === PromoTargetType.CATEGORY && !value.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'categoryId wajib diisi untuk target category',
      });
    }

    if (value.targetType === PromoTargetType.PRODUCT && !value.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'productId wajib diisi untuk target product',
      });
    }

    if (
      isTextBasedPromoTargetType(value.targetType) &&
      !value.targetTextValue?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetTextValue'],
        message: 'Nilai target wajib diisi',
      });
    }

    if (value.targetType !== PromoTargetType.CATEGORY && value.categoryId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['categoryId'],
        message: 'categoryId hanya boleh diisi untuk target category',
      });
    }

    if (value.targetType !== PromoTargetType.PRODUCT && value.productId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['productId'],
        message: 'productId hanya boleh diisi untuk target product',
      });
    }

    if (
      !isTextBasedPromoTargetType(value.targetType) &&
      value.targetTextValue?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetTextValue'],
        message: 'targetTextValue hanya boleh diisi untuk target name / brand / unit',
      });
    }

    if (value.endDate < value.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endDate'],
        message: 'Tanggal akhir tidak boleh sebelum tanggal mulai',
      });
    }

    if (
      value.startDate === value.endDate &&
      value.endTime <= value.startTime
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['endTime'],
        message: 'Jam akhir harus lebih besar dari jam mulai jika tanggal sama',
      });
    }

    if (
      value.outletScope === PromoOutletScope.SELECTED_OUTLETS &&
      value.selectedOutletIds.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedOutletIds'],
        message: 'selectedOutletIds wajib diisi minimal 1 outlet untuk SELECTED_OUTLETS',
      });
    }
  });

export const listPromosSchema = z.object({
  query: z.object({
    search: z.string().trim().optional(),
    targetType: z.nativeEnum(PromoTargetType).optional(),
    effectiveStatus: z
      .enum(['ACTIVE', 'INACTIVE', 'SCHEDULED', 'EXPIRED'])
      .optional(),
    status: z.nativeEnum(PromoStatus).optional(),
    outletScope: z.nativeEnum(PromoOutletScope).optional(),
  }),
});

export const getPromoByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const createPromoSchema = z.object({
  body: promoBodySchema,
});

export const updatePromoSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: promoBodySchema,
});

export const updatePromoStatusSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    status: z.nativeEnum(PromoStatus),
  }),
});
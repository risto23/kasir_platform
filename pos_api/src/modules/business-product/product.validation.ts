// pos_api/src/modules/business-product/product.validation.ts
import { ProductStatus } from '@prisma/client';
import { z } from 'zod';

const nullableTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === undefined || value === null) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  });

const priceSchema = z.coerce.number().refine((value) => Number.isFinite(value), {
  message: 'Base price harus berupa angka',
}).min(0, 'Base price tidak boleh kurang dari 0');

export const productListQuerySchema = z.object({
  search: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }),
  status: z.nativeEnum(ProductStatus).optional(),
  categoryId: z
    .union([z.string(), z.undefined()])
    .transform((value) => {
      if (value === undefined) {
        return undefined;
      }

      const trimmed = value.trim();
      return trimmed.length ? trimmed : undefined;
    }),
});

export const createProductSchema = z.object({
  categoryId: nullableTrimmedString,
  name: z.string().trim().min(1, 'Nama product wajib diisi').max(150),
  sku: nullableTrimmedString,
  brand: nullableTrimmedString,
  unit: nullableTrimmedString,
  description: nullableTrimmedString,
  imageUrl: nullableTrimmedString,
  basePrice: priceSchema,
});

export const updateProductSchema = z.object({
  categoryId: nullableTrimmedString,
  name: z.string().trim().min(1, 'Nama product wajib diisi').max(150),
  sku: nullableTrimmedString,
  brand: nullableTrimmedString,
  unit: nullableTrimmedString,
  description: nullableTrimmedString,
  imageUrl: nullableTrimmedString,
  basePrice: priceSchema,
});

export const updateProductStatusSchema = z.object({
  status: z.nativeEnum(ProductStatus),
});

export type ProductListQueryDto = z.infer<typeof productListQuerySchema>;
export type CreateProductDto = z.infer<typeof createProductSchema>;
export type UpdateProductDto = z.infer<typeof updateProductSchema>;
export type UpdateProductStatusDto = z.infer<typeof updateProductStatusSchema>;
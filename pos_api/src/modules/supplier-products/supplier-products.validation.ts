import { z } from 'zod';

const cuidSchema = z.string().cuid();

export const supplierProductParamsSchema = z.object({
  params: z.object({
    supplierId: cuidSchema,
  }),
  query: z.object({
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  }).optional(),
  body: z.object({}).optional(),
});

export const supplierProductMappingParamsSchema = z.object({
  params: z.object({
    supplierId: cuidSchema,
    mappingId: cuidSchema,
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

const supplierProductBodyFields = {
  productId: cuidSchema,
  supplierSku: z.string().trim().max(100).optional(),
  lastPurchasePrice: z.coerce.number().min(0).optional(),
  minimumOrderQty: z.coerce.number().positive().optional(),
  isPrimarySupplier: z.boolean().optional(),
};

export const createSupplierProductSchema = z.object({
  params: z.object({
    supplierId: cuidSchema,
  }),
  body: z.object(supplierProductBodyFields),
  query: z.object({}).optional(),
});

export const updateSupplierProductSchema = z.object({
  params: z.object({
    supplierId: cuidSchema,
    mappingId: cuidSchema,
  }),
  body: z.object(supplierProductBodyFields),
  query: z.object({}).optional(),
});

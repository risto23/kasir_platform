import { z } from 'zod';

export const scopeSchema = z.enum(['business','outlet']).default('outlet');
export const groupBySchema = z.enum(['day','week','month']).default('day');

export const ymdSchema = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/); // yyyy-mm-dd

export const dateRangeSchema = z.object({
  start: ymdSchema,
  end: ymdSchema,
});

export const salesSummaryQuerySchema = z.object({
  scope: scopeSchema.optional(),
  outletId: z.string().cuid().optional(),
  groupBy: groupBySchema.optional(),
  start: ymdSchema,
  end: ymdSchema,
});

export const ordersReportQuerySchema = z.object({
  scope: scopeSchema.optional(),
  outletId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  start: ymdSchema,
  end: ymdSchema,
});

export const itemsReportQuerySchema = z.object({
  scope: scopeSchema.optional(),
  outletId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(200).optional(),
  start: ymdSchema,
  end: ymdSchema,
});

export const supplierPayablesReportQuerySchema = z.object({
  scope: scopeSchema.optional(),
  outletId: z.string().cuid().optional(),
  supplierId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(200).optional(),
  asOfDate: ymdSchema,
});

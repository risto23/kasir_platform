import { z } from 'zod';

export const scopeSchema = z.enum(['business','outlet']).default('outlet');
export const groupBySchema = z.enum(['day','week','month']).default('day');

export const dateRangeSchema = z.object({
  start: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/), // yyyy-mm-dd
  end: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
});

export const salesSummaryQuerySchema = z.object({
  scope: scopeSchema.optional(),
  outletId: z.string().cuid().optional(),
  groupBy: groupBySchema.optional(),
  start: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  end: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
});

export const ordersReportQuerySchema = z.object({
  scope: scopeSchema.optional(),
  outletId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(100).optional(),
  start: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  end: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
});

export const itemsReportQuerySchema = z.object({
  scope: scopeSchema.optional(),
  outletId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).optional(),
  perPage: z.coerce.number().int().min(1).max(200).optional(),
  start: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
  end: z.string().regex(/^\\d{4}-\\d{2}-\\d{2}$/),
});

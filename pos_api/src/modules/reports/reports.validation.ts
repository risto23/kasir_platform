import { z } from 'zod';

export const outletSalesQuerySchema = z.object({
  query: z.object({
    outletId: z.string().min(1),
    dateFrom: z.string().optional(), // YYYY-MM-DD or ISO
    dateTo: z.string().optional(),
    timezone: z.string().optional(),
  }),
});

export const businessSalesQuerySchema = z.object({
  query: z.object({
    outletIds: z
      .union([z.array(z.string()), z.string()])
      .optional()
      .transform((v) => (Array.isArray(v) ? v : typeof v === 'string' && v.length > 0 ? [v] : undefined)),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    groupBy: z.enum(['day', 'outlet']).optional(),
    timezone: z.string().optional(),
  }),
});

export const healthQuerySchema = z.object({
  query: z.object({
    // optional for future use
  }),
});
import { z } from 'zod';

export const getPosChargesQuerySchema = z.object({
  query: z.object({
    outletId: z.string().min(1, 'outletId wajib diisi'),
  }),
});

export const putPosChargesBodySchema = z.object({
  body: z.object({
    outletId: z.string().min(1, 'outletId wajib diisi'),
    charges: z
      .array(
        z.object({
          key: z.string().min(1),
          label: z.string().min(1),
          type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
          value: z.number().nonnegative(),
          enabled: z.boolean(),
          sortOrder: z.number().int().nonnegative().optional().default(0),
        }),
      )
      .max(10),
    rounding: z.object({
      enabled: z.boolean().default(true),
      method: z.enum(['NONE', 'NEAREST', 'CEIL', 'FLOOR']).default('CEIL'),
      unit: z.number().int().positive().default(100),
    }),
  }),
});

export type PutPosChargesBody = z.infer<typeof putPosChargesBodySchema>['body'];

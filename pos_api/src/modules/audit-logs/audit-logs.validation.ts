import { z } from 'zod';

export const listAuditLogsQuerySchema = z.object({
  query: z.object({
    outletId: z.string().cuid().optional(),
    action: z.string().trim().min(1).max(100).optional(),
    entityType: z.string().trim().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>['query'];

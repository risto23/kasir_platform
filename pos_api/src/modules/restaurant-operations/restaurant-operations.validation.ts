import { z } from 'zod';

const outletParamsSchema = z.object({
  outletId: z.string().trim().min(1, 'outletId wajib diisi'),
});

const outletTableParamsSchema = z.object({
  outletId: z.string().trim().min(1, 'outletId wajib diisi'),
  tableId: z.string().trim().min(1, 'tableId wajib diisi'),
});

export const getTableQrValidationSchema = z.object({
  params: outletTableParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});

export const getOutletTableMonitorValidationSchema = z.object({
  params: outletParamsSchema,
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});
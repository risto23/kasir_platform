import { OutletStatus } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const outletIdParamSchema = z.object({
  id: z.string().min(1, 'Outlet id is required'),
});

const listOutletsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(OutletStatus).optional(),
});

const createOutletBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name maksimal 120 karakter'),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  status: z.nativeEnum(OutletStatus).optional().default(OutletStatus.ACTIVE),
});

const updateOutletBodySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120, 'Name maksimal 120 karakter'),
  address: z.string().trim().optional().nullable(),
  phone: z.string().trim().optional().nullable(),
  status: z.nativeEnum(OutletStatus).optional().default(OutletStatus.ACTIVE),
});

const updateOutletStatusBodySchema = z.object({
  status: z.nativeEnum(OutletStatus),
});

function buildValidationErrorResponse(res: Response, error: z.ZodError) {
  return res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: error.flatten(),
  });
}

export type ListOutletsQuery = z.infer<typeof listOutletsQuerySchema>;
export type CreateOutletBody = z.infer<typeof createOutletBodySchema>;
export type UpdateOutletBody = z.infer<typeof updateOutletBodySchema>;
export type UpdateOutletStatusBody = z.infer<typeof updateOutletStatusBodySchema>;

export type OutletsRequest = Request & {
  validatedQuery?: ListOutletsQuery;
  validatedBody?: CreateOutletBody | UpdateOutletBody | UpdateOutletStatusBody;
  validatedParams?: {
    id: string;
  };
};

export function validateOutletIdParam(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = outletIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as OutletsRequest).validatedParams = parsed.data;
  return next();
}

export function validateListOutletsQuery(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = listOutletsQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as OutletsRequest).validatedQuery = parsed.data;
  return next();
}

export function validateCreateOutlet(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = createOutletBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as OutletsRequest).validatedBody = parsed.data;
  return next();
}

export function validateUpdateOutlet(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateOutletBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as OutletsRequest).validatedBody = parsed.data;
  return next();
}

export function validateUpdateOutletStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateOutletStatusBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as OutletsRequest).validatedBody = parsed.data;
  return next();
}
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const nullableTrimmedString = (max: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return null;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .refine(
      (value) => value === null || value.length <= max,
      `Maksimal ${max} karakter`,
    );

const nullableNonNegativeInteger = (max: number) =>
  z
    .union([z.coerce.number().int().min(0).max(max), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return null;
      }

      return value;
    });

const listSuppliersQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  isPreferred: z
    .union([z.literal('true'), z.literal('false')])
    .transform((value) => value === 'true')
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
});

const supplierParamsSchema = z.object({
  id: z.string().trim().min(1, 'Supplier id wajib diisi'),
});

const createSupplierBodySchema = z.object({
  code: nullableTrimmedString(50),
  name: z.string().trim().min(1, 'Nama supplier wajib diisi').max(100),
  phone: nullableTrimmedString(30),
  email: nullableTrimmedString(100).refine(
    (value) => value === null || z.string().email().safeParse(value).success,
    'Email supplier tidak valid',
  ),
  address: nullableTrimmedString(500),
  paymentTermDays: nullableNonNegativeInteger(3650),
  taxNumber: nullableTrimmedString(50),
  notes: nullableTrimmedString(1000),
  leadTimeDays: nullableNonNegativeInteger(3650),
  isPreferred: z.boolean().optional().default(false),
});

const updateSupplierBodySchema = z.object({
  code: nullableTrimmedString(50),
  name: z.string().trim().min(1, 'Nama supplier wajib diisi').max(100),
  phone: nullableTrimmedString(30),
  email: nullableTrimmedString(100).refine(
    (value) => value === null || z.string().email().safeParse(value).success,
    'Email supplier tidak valid',
  ),
  address: nullableTrimmedString(500),
  paymentTermDays: nullableNonNegativeInteger(3650),
  taxNumber: nullableTrimmedString(50),
  notes: nullableTrimmedString(1000),
  leadTimeDays: nullableNonNegativeInteger(3650),
  isPreferred: z.boolean().optional().default(false),
});

const updateSupplierStatusBodySchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

function buildValidationError(errors: z.ZodIssue[]) {
  return errors.map((item) => ({
    field: item.path.join('.'),
    message: item.message,
  }));
}

export function validateListSuppliers(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = listSuppliersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Query supplier tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedQuery = parsed.data;
  return next();
}

export function validateSupplierParams(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = supplierParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Parameter supplier tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedParams = parsed.data;
  return next();
}

export function validateCreateSupplier(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = createSupplierBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload create supplier tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}

export function validateUpdateSupplier(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateSupplierBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload update supplier tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}

export function validateUpdateSupplierStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateSupplierStatusBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload status supplier tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}

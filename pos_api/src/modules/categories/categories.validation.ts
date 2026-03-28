import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

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

const listCategoriesQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
});

const categoryParamsSchema = z.object({
  id: z.string().trim().min(1, 'Category id is required'),
});

const createCategoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(100),
  code: nullableTrimmedString(50),
  description: nullableTrimmedString(500),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const updateCategoryBodySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(100),
  code: nullableTrimmedString(50),
  description: nullableTrimmedString(500),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const updateCategoryStatusBodySchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

function buildValidationError(errors: z.ZodIssue[]) {
  return errors.map((item) => ({
    field: item.path.join('.'),
    message: item.message,
  }));
}

export function validateListCategories(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = listCategoriesQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Query kategori tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedQuery = parsed.data;
  return next();
}

export function validateCategoryParams(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = categoryParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Parameter kategori tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedParams = parsed.data;
  return next();
}

export function validateCreateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = createCategoryBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload create kategori tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}

export function validateUpdateCategory(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateCategoryBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload update kategori tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}

export function validateUpdateCategoryStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateCategoryStatusBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload status kategori tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}
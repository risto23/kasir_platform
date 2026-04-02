import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

const nullableTrimmedString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null));

const nullableImagePathString = z
  .string()
  .trim()
  .max(1000, 'Path foto produk terlalu panjang')
  .optional()
  .transform((value) => (value && value.length > 0 ? value : null));

const productListQuerySchema = z.object({
  search: z.string().trim().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  categoryId: z.string().trim().optional(),
  outletId: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(10),
});

const productParamsSchema = z.object({
  id: z.string().trim().min(1, 'Product id is required'),
});

const createProductBodySchema = z.object({
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  name: z.string().trim().min(1, 'Nama produk wajib diisi').max(150),
  sku: nullableTrimmedString(100),
  barcode: nullableTrimmedString(100),
  brand: nullableTrimmedString(100),
  unit: nullableTrimmedString(50),
  description: nullableTrimmedString(1000),
  imageUrl: nullableImagePathString,
  basePrice: z.coerce.number().finite().min(0, 'Harga dasar tidak boleh negatif'),
});

const updateProductBodySchema = z.object({
  categoryId: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  name: z.string().trim().min(1, 'Nama produk wajib diisi').max(150),
  sku: nullableTrimmedString(100),
  barcode: nullableTrimmedString(100),
  brand: nullableTrimmedString(100),
  unit: nullableTrimmedString(50),
  description: nullableTrimmedString(1000),
  imageUrl: nullableImagePathString,
  basePrice: z.coerce.number().finite().min(0, 'Harga dasar tidak boleh negatif'),
});

const updateProductStatusBodySchema = z.object({
  status: z.enum(['ACTIVE', 'INACTIVE']),
});

function buildValidationError(errors: z.ZodIssue[]) {
  return errors.map((item) => ({
    field: item.path.join('.'),
    message: item.message,
  }));
}

export function validateListProducts(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = productListQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Query product tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedQuery = parsed.data;
  return next();
}

export function validateProductParams(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = productParamsSchema.safeParse(req.params);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Parameter product tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedParams = parsed.data;
  return next();
}

export function validateCreateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = createProductBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload create product tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}

export function validateUpdateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateProductBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload update product tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}

export function validateUpdateProductStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateProductStatusBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: 'Payload status product tidak valid.',
      errors: buildValidationError(parsed.error.issues),
    });
  }

  res.locals.validatedBody = parsed.data;
  return next();
}
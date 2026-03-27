import { BusinessRoleCode, BusinessUserStatus } from '@prisma/client';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';

const businessUserIdParamSchema = z.object({
  id: z.string().min(1, 'Business user id is required'),
});

const listBusinessUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(10),
  search: z.string().trim().optional(),
  status: z.nativeEnum(BusinessUserStatus).optional(),
  roleCode: z.nativeEnum(BusinessRoleCode).optional(),
});

const createBusinessUserBodySchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('Email is invalid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  businessRoleCode: z.nativeEnum(BusinessRoleCode),
  hasAllOutletAccess: z.boolean().optional().default(false),
  outletIds: z.array(z.string().min(1)).optional().default([]),
  status: z.nativeEnum(BusinessUserStatus).optional().default(BusinessUserStatus.ACTIVE),
});

const updateBusinessUserBodySchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('Email is invalid'),
  businessRoleCode: z.nativeEnum(BusinessRoleCode),
  hasAllOutletAccess: z.boolean().optional().default(false),
  outletIds: z.array(z.string().min(1)).optional().default([]),
  status: z.nativeEnum(BusinessUserStatus).optional().default(BusinessUserStatus.ACTIVE),
});

const updateBusinessUserStatusBodySchema = z.object({
  status: z.nativeEnum(BusinessUserStatus),
});

const updateBusinessUserOutletAccessBodySchema = z.object({
  hasAllOutletAccess: z.boolean().optional().default(false),
  outletIds: z.array(z.string().min(1)).optional().default([]),
});

function buildValidationErrorResponse(
  res: Response,
  error: z.ZodError,
) {
  return res.status(400).json({
    success: false,
    message: 'Validation error',
    errors: error.flatten(),
  });
}

export type ListBusinessUsersQuery = z.infer<typeof listBusinessUsersQuerySchema>;
export type CreateBusinessUserBody = z.infer<typeof createBusinessUserBodySchema>;
export type UpdateBusinessUserBody = z.infer<typeof updateBusinessUserBodySchema>;
export type UpdateBusinessUserStatusBody = z.infer<typeof updateBusinessUserStatusBodySchema>;
export type UpdateBusinessUserOutletAccessBody = z.infer<typeof updateBusinessUserOutletAccessBodySchema>;

export type BusinessUsersRequest = Request & {
  validatedQuery?: ListBusinessUsersQuery;
  validatedBody?:
    | CreateBusinessUserBody
    | UpdateBusinessUserBody
    | UpdateBusinessUserStatusBody
    | UpdateBusinessUserOutletAccessBody;
  validatedParams?: {
    id: string;
  };
};

export function validateBusinessUserIdParam(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = businessUserIdParamSchema.safeParse(req.params);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as BusinessUsersRequest).validatedParams = parsed.data;
  return next();
}

export function validateListBusinessUsersQuery(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = listBusinessUsersQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as BusinessUsersRequest).validatedQuery = parsed.data;
  return next();
}

export function validateCreateBusinessUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = createBusinessUserBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as BusinessUsersRequest).validatedBody = parsed.data;
  return next();
}

export function validateUpdateBusinessUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateBusinessUserBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as BusinessUsersRequest).validatedBody = parsed.data;
  return next();
}

export function validateUpdateBusinessUserStatus(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateBusinessUserStatusBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as BusinessUsersRequest).validatedBody = parsed.data;
  return next();
}

export function validateUpdateBusinessUserOutletAccess(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const parsed = updateBusinessUserOutletAccessBodySchema.safeParse(req.body);

  if (!parsed.success) {
    return buildValidationErrorResponse(res, parsed.error);
  }

  (req as BusinessUsersRequest).validatedBody = parsed.data;
  return next();
}
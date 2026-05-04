import type { NextFunction, Request, Response } from 'express';
import {
  createBusinessUser,
  getBusinessUserDetail,
  getBusinessUserOutletAccess,
  listBusinessUsers,
  updateBusinessUser,
  updateBusinessUserOutletAccess,
  updateBusinessUserStatus,
} from './business-users.service';
import type {
  BusinessUsersRequest,
  CreateBusinessUserBody,
  ListBusinessUsersQuery,
  UpdateBusinessUserBody,
  UpdateBusinessUserOutletAccessBody,
  UpdateBusinessUserStatusBody,
} from './business-users.validation';

type RequestWithBusinessAccess = BusinessUsersRequest & {
  businessAccess?: {
    businessId: string;
  };
};

function getCurrentBusinessId(req: RequestWithBusinessAccess) {
  const businessId = req.businessAccess?.businessId;

  if (!businessId) {
    const error = new Error('Business context tidak ditemukan') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  return businessId;
}

function getValidatedId(req: RequestWithBusinessAccess) {
  const id = req.validatedParams?.id;

  if (!id) {
    const error = new Error('Business user id tidak ditemukan') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  return id;
}

export async function listBusinessUsersController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const query = typedReq.validatedQuery as ListBusinessUsersQuery;

    const data = await listBusinessUsers(businessId, query, req.authUser);

    return res.status(200).json({
      success: true,
      message: 'Business users fetched successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function createBusinessUserController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const body = typedReq.validatedBody as CreateBusinessUserBody;

    const data = await createBusinessUser(businessId, body, req.authUser);

    return res.status(201).json({
      success: true,
      message: 'Business user created successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getBusinessUserDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const businessUserId = getValidatedId(typedReq);

    const data = await getBusinessUserDetail(businessId, businessUserId, req.authUser);

    return res.status(200).json({
      success: true,
      message: 'Business user fetched successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function updateBusinessUserController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const businessUserId = getValidatedId(typedReq);
    const body = typedReq.validatedBody as UpdateBusinessUserBody;

    const data = await updateBusinessUser(businessId, businessUserId, body, req.authUser);

    return res.status(200).json({
      success: true,
      message: 'Business user updated successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function updateBusinessUserStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const businessUserId = getValidatedId(typedReq);
    const body = typedReq.validatedBody as UpdateBusinessUserStatusBody;

    const data = await updateBusinessUserStatus(businessId, businessUserId, body, req.authUser);

    return res.status(200).json({
      success: true,
      message: 'Business user status updated successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getBusinessUserOutletAccessController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const businessUserId = getValidatedId(typedReq);

    const data = await getBusinessUserOutletAccess(businessId, businessUserId);

    return res.status(200).json({
      success: true,
      message: 'Business user outlet access fetched successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function updateBusinessUserOutletAccessController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const businessUserId = getValidatedId(typedReq);
    const body = typedReq.validatedBody as UpdateBusinessUserOutletAccessBody;

    const data = await updateBusinessUserOutletAccess(businessId, businessUserId, body);

    return res.status(200).json({
      success: true,
      message: 'Business user outlet access updated successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}
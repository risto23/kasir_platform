import type { NextFunction, Request, Response } from 'express';
import {
  createOutlet,
  getOutletDetail,
  listOutlets,
  updateOutlet,
  updateOutletStatus,
} from './outlets.service';
import type {
  CreateOutletBody,
  ListOutletsQuery,
  OutletsRequest,
  UpdateOutletBody,
  UpdateOutletStatusBody,
} from './outlets.validation';
import { buildFieldChangeSet, createAuditLogSafely } from '../../utils/audit-log';

type RequestWithBusinessAccess = OutletsRequest & {
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
    const error = new Error('Outlet id tidak ditemukan') as Error & {
      statusCode?: number;
    };
    error.statusCode = 400;
    throw error;
  }

  return id;
}

export async function listOutletsController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const query = typedReq.validatedQuery as ListOutletsQuery;

    const data = await listOutlets(businessId, query);

    return res.status(200).json({
      success: true,
      message: 'Outlets fetched successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function createOutletController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const body = typedReq.validatedBody as CreateOutletBody;

    const data = await createOutlet(businessId, body);
    await createAuditLogSafely({
      businessId,
      outletId: data.id,
      actorUserId: req.authUser?.userId,
      actorBusinessUserId: typedReq.businessAccess?.businessUserId,
      action: 'OUTLET_CREATED',
      entityType: 'OUTLET',
      entityId: data.id,
      entityLabel: data.name,
      summary: `Outlet ${data.name} dibuat`,
      changes: {
        after: {
          name: data.name,
          code: data.code,
          address: data.address,
          phone: data.phone,
          status: data.status,
        },
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Outlet created successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function getOutletDetailController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const outletId = getValidatedId(typedReq);

    const data = await getOutletDetail(businessId, outletId);

    return res.status(200).json({
      success: true,
      message: 'Outlet fetched successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function updateOutletController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const outletId = getValidatedId(typedReq);
    const body = typedReq.validatedBody as UpdateOutletBody;
    const before = await getOutletDetail(businessId, outletId);

    const data = await updateOutlet(businessId, outletId, body);
    const changes = buildFieldChangeSet(
      {
        name: before.name,
        address: before.address,
        phone: before.phone,
        status: before.status,
      },
      {
        name: data.name,
        address: data.address,
        phone: data.phone,
        status: data.status,
      },
      ['name', 'address', 'phone', 'status'],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId,
        outletId: data.id,
        actorUserId: req.authUser?.userId,
        actorBusinessUserId: typedReq.businessAccess?.businessUserId,
        action: 'OUTLET_UPDATED',
        entityType: 'OUTLET',
        entityId: data.id,
        entityLabel: data.name,
        summary: `Outlet ${data.name} diperbarui`,
        changes,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Outlet updated successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

export async function updateOutletStatusController(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const typedReq = req as RequestWithBusinessAccess;
    const businessId = getCurrentBusinessId(typedReq);
    const outletId = getValidatedId(typedReq);
    const body = typedReq.validatedBody as UpdateOutletStatusBody;
    const before = await getOutletDetail(businessId, outletId);

    const data = await updateOutletStatus(businessId, outletId, body);
    const changes = buildFieldChangeSet(
      { status: before.status },
      { status: data.status },
      ['status'],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId,
        outletId: data.id,
        actorUserId: req.authUser?.userId,
        actorBusinessUserId: typedReq.businessAccess?.businessUserId,
        action: 'OUTLET_STATUS_UPDATED',
        entityType: 'OUTLET',
        entityId: data.id,
        entityLabel: data.name,
        summary: `Status outlet ${data.name} diubah ke ${data.status}`,
        changes,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Outlet status updated successfully',
      data,
    });
  } catch (error: unknown) {
    return next(error);
  }
}

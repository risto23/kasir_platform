// pos_api/src/modules/platform-business/platform-business.controller.ts
import { Request, Response } from 'express';
import { BusinessStatus } from '@prisma/client';
import { successResponse, errorResponse } from '../../utils/api-response';
import { buildFieldChangeSet, createAuditLogSafely } from '../../utils/audit-log';
import {
  createBusinessService,
  getBusinessByIdService,
  listBusinessesService,
  updateBusinessService,
  updateBusinessStatusService,
} from './platform-business.service';

type BusinessIdParams = {
  id: string;
};

type CreateBusinessBody = {
  name: string;
  slug: string;
  businessType: 'RESTAURANT' | 'RETAIL';
  ownerUserId?: string;
  featureFlagKeys?: string[];
};

type UpdateBusinessBody = {
  name: string;
  slug: string;
  ownerUserId?: string | null;
};

type UpdateBusinessStatusBody = {
  status: BusinessStatus;
};

export async function listBusinessesController(_req: Request, res: Response) {
  try {
    const result = await listBusinessesService();
    return res.json(successResponse('Businesses fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch businesses';
    return res.status(500).json(errorResponse(message));
  }
}

export async function getBusinessByIdController(
  req: Request<BusinessIdParams>,
  res: Response
) {
  try {
    const result = await getBusinessByIdService(req.params.id);
    return res.json(successResponse('Business fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch business';
    return res.status(404).json(errorResponse(message));
  }
}

export async function createBusinessController(
  req: Request<Record<string, never>, unknown, CreateBusinessBody>,
  res: Response
) {
  try {
    const result = await createBusinessService(req.body);
    await createAuditLogSafely({
      businessId: result.id,
      actorUserId: req.authUser?.userId,
      action: 'BUSINESS_CREATED',
      entityType: 'BUSINESS',
      entityId: result.id,
      entityLabel: result.name,
      summary: `Business ${result.name} dibuat`,
      changes: {
        after: {
          name: result.name,
          slug: result.slug,
          businessType: result.businessType,
          status: result.status,
        },
      },
    });
    return res.status(201).json(successResponse('Business created', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to create business';
    return res.status(400).json(errorResponse(message));
  }
}

export async function updateBusinessController(
  req: Request<BusinessIdParams, unknown, UpdateBusinessBody>,
  res: Response
) {
  try {
    const before = await getBusinessByIdService(req.params.id);
    const result = await updateBusinessService(req.params.id, req.body);
    const changes = buildFieldChangeSet(
      {
        name: before.name,
        slug: before.slug,
        ownerUserId: before.ownerUserId,
      },
      {
        name: result.name,
        slug: result.slug,
        ownerUserId: result.ownerUserId,
      },
      ['name', 'slug', 'ownerUserId'],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId: result.id,
        actorUserId: req.authUser?.userId,
        action: 'BUSINESS_UPDATED',
        entityType: 'BUSINESS',
        entityId: result.id,
        entityLabel: result.name,
        summary: `Business ${result.name} diperbarui`,
        changes,
      });
    }

    return res.json(successResponse('Business updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update business';
    return res.status(400).json(errorResponse(message));
  }
}

export async function updateBusinessStatusController(
  req: Request<BusinessIdParams, unknown, UpdateBusinessStatusBody>,
  res: Response
) {
  try {
    const before = await getBusinessByIdService(req.params.id);
    const result = await updateBusinessStatusService(
      req.params.id,
      req.body.status
    );
    const changes = buildFieldChangeSet(
      { status: before.status },
      { status: result.status },
      ['status'],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId: result.id,
        actorUserId: req.authUser?.userId,
        action: 'BUSINESS_STATUS_UPDATED',
        entityType: 'BUSINESS',
        entityId: result.id,
        entityLabel: result.name,
        summary: `Status business ${result.name} diubah ke ${result.status}`,
        changes,
      });
    }

    return res.json(successResponse('Business status updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to update business status';
    return res.status(400).json(errorResponse(message));
  }
}

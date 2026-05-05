import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import {
  getBusinessFeatureFlagsService,
  getBusinessFeatureFlagAuditLogsService,
  getBusinessesFeatureSummaryService,
  getPlanFeatureFlagsService,
  getPlansFeatureMatrixService,
  getPlatformAuditLogsService,
  listFeatureFlagsService,
  overrideBusinessFeatureFlagService,
  setPlanFeatureFlagsService,
  updateBusinessFeatureFlagsService,
} from './platform-feature-flag.service';

type BusinessIdParams = { id: string };
type PlanIdParams = { planId: string };

type UpdateBusinessFeatureFlagsBody = { featureFlagKeys: string[] };
type SetPlanFeatureFlagsBody = { featureFlagKeys: string[] };
type OverrideBusinessFeatureFlagBody = {
  featureFlagKey: string;
  enabled: boolean;
  reason?: string | null;
};

// ─── existing controllers ─────────────────────────────────────────────────────

export async function listFeatureFlagsController(_req: Request, res: Response) {
  try {
    const result = await listFeatureFlagsService();
    return res.json(successResponse('Feature flags fetched', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch feature flags';
    return res.status(500).json(errorResponse(message));
  }
}

export async function getBusinessFeatureFlagsController(
  req: Request<BusinessIdParams>,
  res: Response
) {
  try {
    const result = await getBusinessFeatureFlagsService(req.params.id);
    return res.json(successResponse('Business feature flags fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch business feature flags';
    return res.status(404).json(errorResponse(message));
  }
}

export async function updateBusinessFeatureFlagsController(
  req: Request<BusinessIdParams, unknown, UpdateBusinessFeatureFlagsBody>,
  res: Response
) {
  try {
    const result = await updateBusinessFeatureFlagsService(
      req.params.id,
      req.body.featureFlagKeys
    );
    return res.json(successResponse('Business feature flags updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update business feature flags';
    return res.status(400).json(errorResponse(message));
  }
}

// ─── plan feature flags ───────────────────────────────────────────────────────

export async function getPlansFeatureMatrixController(_req: Request, res: Response) {
  try {
    const result = await getPlansFeatureMatrixService();
    return res.json(successResponse('Plans feature matrix fetched', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plans feature matrix';
    return res.status(500).json(errorResponse(message));
  }
}

export async function getPlanFeatureFlagsController(
  req: Request<PlanIdParams>,
  res: Response
) {
  try {
    const result = await getPlanFeatureFlagsService(req.params.planId);
    return res.json(successResponse('Plan feature flags fetched', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch plan feature flags';
    const status = error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 500;
    return res.status(status).json(errorResponse(message));
  }
}

export async function setPlanFeatureFlagsController(
  req: Request<PlanIdParams, unknown, SetPlanFeatureFlagsBody>,
  res: Response
) {
  try {
    const result = await setPlanFeatureFlagsService(
      req.params.planId,
      req.body.featureFlagKeys,
      req.authUser?.userId ?? null
    );
    return res.json(successResponse('Plan feature flags updated', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update plan feature flags';
    const status = error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
    return res.status(status).json(errorResponse(message));
  }
}

// ─── platform audit logs ──────────────────────────────────────────────────────

export async function getPlatformAuditLogsController(req: Request, res: Response) {
  try {
    const entityType = typeof req.query['entityType'] === 'string' ? req.query['entityType'] : undefined;
    const entityId = typeof req.query['entityId'] === 'string' ? req.query['entityId'] : undefined;
    const limitRaw = typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : 50;
    const limit = Number.isNaN(limitRaw) ? 50 : Math.min(limitRaw, 200);

    const result = await getPlatformAuditLogsService({ entityType, entityId, limit });
    return res.json(successResponse('Platform audit logs fetched', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch platform audit logs';
    return res.status(500).json(errorResponse(message));
  }
}

// ─── business feature override ────────────────────────────────────────────────

export async function overrideBusinessFeatureFlagController(
  req: Request<BusinessIdParams, unknown, OverrideBusinessFeatureFlagBody>,
  res: Response
) {
  try {
    const result = await overrideBusinessFeatureFlagService(
      req.params.id,
      req.body.featureFlagKey,
      req.body.enabled,
      req.body.reason ?? null,
      req.authUser?.userId ?? null
    );
    return res.json(successResponse('Business feature flag overridden', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to override business feature flag';
    const status = error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 400;
    return res.status(status).json(errorResponse(message));
  }
}

export async function getBusinessFeatureFlagAuditLogsController(
  req: Request<BusinessIdParams>,
  res: Response
) {
  try {
    const limitRaw = typeof req.query['limit'] === 'string' ? parseInt(req.query['limit'], 10) : 30;
    const limit = Number.isNaN(limitRaw) ? 30 : Math.min(limitRaw, 100);
    const result = await getBusinessFeatureFlagAuditLogsService(req.params.id, limit);
    return res.json(successResponse('Business feature flag audit logs fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch audit logs';
    const status = error instanceof Error && error.message.includes('tidak ditemukan') ? 404 : 500;
    return res.status(status).json(errorResponse(message));
  }
}

// ─── businesses summary ───────────────────────────────────────────────────────

export async function getBusinessesFeatureSummaryController(_req: Request, res: Response) {
  try {
    const result = await getBusinessesFeatureSummaryService();
    return res.json(successResponse('Businesses feature summary fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch businesses feature summary';
    return res.status(500).json(errorResponse(message));
  }
}

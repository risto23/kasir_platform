import type { Request, Response } from 'express';
import { buildFieldChangeSet, createAuditLogSafely } from '../../utils/audit-log';
import { errorResponse, successResponse } from '../../utils/api-response';
import {
  getBusinessSettings,
  putBusinessSettings,
} from './business-settings.service';
import { putBusinessSettingsBodySchema } from './business-settings.validation';

export async function getBusinessSettingsController(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;

    if (!businessId) {
      return res.status(400).json(errorResponse('Business context tidak tersedia'));
    }

    const result = await getBusinessSettings(businessId);
    return res.json(successResponse('Business settings fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch business settings';
    return res.status(400).json(errorResponse(message));
  }
}

export async function putBusinessSettingsController(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;

    if (!businessId) {
      return res.status(400).json(errorResponse('Business context tidak tersedia'));
    }

    const parsed = putBusinessSettingsBodySchema.parse({ body: req.body });
    const before = await getBusinessSettings(businessId);
    const result = await putBusinessSettings({
      businessId,
      payload: parsed.body,
    });

    const changes = buildFieldChangeSet(
      before,
      result,
      ['businessName', 'supportEmail', 'supportPhone', 'websiteUrl', 'address', 'tagline'],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId,
        actorUserId: req.authUser?.userId,
        actorBusinessUserId: req.businessAccess?.businessUserId,
        action: 'BUSINESS_SETTINGS_UPDATED',
        entityType: 'BUSINESS_SETTINGS',
        entityId: businessId,
        entityLabel: result.defaults.businessName,
        summary: 'Pengaturan business diperbarui',
        changes,
      });
    }

    return res.json(successResponse('Business settings updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update business settings';
    return res.status(400).json(errorResponse(message));
  }
}

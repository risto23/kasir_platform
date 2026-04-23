import type { Request, Response } from 'express';
import { buildFieldChangeSet, createAuditLogSafely } from '../../utils/audit-log';
import { errorResponse, successResponse } from '../../utils/api-response';
import {
  getOutletSettings,
  putOutletSettings,
} from './outlet-settings.service';
import {
  getOutletSettingsQuerySchema,
  putOutletSettingsBodySchema,
} from './outlet-settings.validation';

export async function getOutletSettingsController(req: Request, res: Response) {
  try {
    const parsed = getOutletSettingsQuerySchema.parse({ query: req.query });
    const result = await getOutletSettings(parsed.query.outletId);
    return res.json(successResponse('Outlet settings fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch outlet settings';
    return res.status(400).json(errorResponse(message));
  }
}

export async function putOutletSettingsController(req: Request, res: Response) {
  try {
    const businessId = req.businessAccess?.businessId;

    if (!businessId) {
      return res.status(400).json(errorResponse('Business context tidak tersedia'));
    }

    const parsed = putOutletSettingsBodySchema.parse({ body: req.body });
    const { outletId, ...payload } = parsed.body;
    const before = await getOutletSettings(outletId);
    const result = await putOutletSettings({
      outletId,
      payload,
    });

    const changes = buildFieldChangeSet(
      before,
      result,
      [
        'outletName',
        'guestQrEnabled',
        'contactEmail',
        'whatsappNumber',
        'mapsUrl',
        'notes',
      ],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId,
        outletId,
        actorUserId: req.authUser?.userId,
        actorBusinessUserId: req.businessAccess?.businessUserId,
        action: 'OUTLET_SETTINGS_UPDATED',
        entityType: 'OUTLET_SETTINGS',
        entityId: outletId,
        entityLabel: result.defaults.outletName,
        summary: 'Pengaturan outlet diperbarui',
        changes,
      });
    }

    return res.json(successResponse('Outlet settings updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update outlet settings';
    return res.status(400).json(errorResponse(message));
  }
}

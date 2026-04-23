import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import { getOutletPosChargeSettings, putOutletPosChargeSettings } from './pos-settings.service';
import { getPosChargesQuerySchema, putPosChargesBodySchema } from './pos-settings.validation';
import { buildFieldChangeSet, createAuditLogSafely } from '../../utils/audit-log';

export async function getPosChargesController(req: Request, res: Response) {
  try {
    const parsed = getPosChargesQuerySchema.parse({ query: req.query });
    const { outletId } = parsed.query;

    const result = await getOutletPosChargeSettings(outletId);
    return res.json(successResponse('POS charges fetched', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch POS charges';
    return res.status(400).json(errorResponse(message));
  }
}

export async function putPosChargesController(req: Request, res: Response) {
  try {
    const parsed = putPosChargesBodySchema.parse({ body: req.body });
    const { outletId, charges, rounding } = parsed.body;

    const businessId = req.businessAccess?.businessId;
    if (!businessId) {
      return res.status(400).json(errorResponse('Business context tidak tersedia'));
    }

    const before = await getOutletPosChargeSettings(outletId);
    const result = await putOutletPosChargeSettings({ businessId, outletId, charges, rounding });
    const changes = buildFieldChangeSet(
      {
        charges: before.charges,
        rounding: before.rounding,
      },
      {
        charges: result.charges,
        rounding: result.rounding,
      },
      ['charges', 'rounding'],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId,
        outletId,
        actorUserId: req.authUser?.userId,
        actorBusinessUserId: req.businessAccess?.businessUserId,
        action: 'POS_SETTINGS_UPDATED',
        entityType: 'POS_SETTINGS',
        entityId: outletId,
        entityLabel: outletId,
        summary: 'Pengaturan POS outlet diperbarui',
        changes,
      });
    }

    return res.json(successResponse('POS charges updated', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update POS charges';
    return res.status(400).json(errorResponse(message));
  }
}

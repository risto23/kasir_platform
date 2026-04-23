import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import { buildFieldChangeSet, createAuditLogSafely } from '../../utils/audit-log';
import {
  getOutletReceiptSettings,
  putOutletReceiptSettings,
} from './receipt-settings.service';
import {
  getReceiptSettingsQuerySchema,
  putReceiptSettingsBodySchema,
} from './receipt-settings.validation';

export async function getReceiptSettingsController(req: Request, res: Response) {
  try {
    const parsed = getReceiptSettingsQuerySchema.parse({ query: req.query });
    const result = await getOutletReceiptSettings(parsed.query.outletId);
    return res.json(successResponse('Receipt settings fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch receipt settings';
    return res.status(400).json(errorResponse(message));
  }
}

export async function putReceiptSettingsController(req: Request, res: Response) {
  try {
    const parsed = putReceiptSettingsBodySchema.parse({ body: req.body });
    const { outletId, ...payload } = parsed.body;

    const businessId = req.businessAccess?.businessId;
    if (!businessId) {
      return res.status(400).json(errorResponse('Business context tidak tersedia'));
    }

    const before = await getOutletReceiptSettings(outletId);
    const result = await putOutletReceiptSettings({
      outletId,
      payload,
    });

    const changes = buildFieldChangeSet(
      before,
      result,
      [
        'brandName',
        'logoUrl',
        'headerText',
        'footerText',
        'showBusinessName',
        'showOutletName',
        'showOutletAddress',
        'showOutletPhone',
      ],
    );

    if (changes) {
      await createAuditLogSafely({
        businessId,
        outletId,
        actorUserId: req.authUser?.userId,
        actorBusinessUserId: req.businessAccess?.businessUserId,
        action: 'RECEIPT_SETTINGS_UPDATED',
        entityType: 'RECEIPT_SETTINGS',
        entityId: outletId,
        entityLabel: result.brandName ?? result.defaults.outletName,
        summary: 'Pengaturan struk outlet diperbarui',
        changes,
      });
    }

    return res.json(successResponse('Receipt settings updated', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to update receipt settings';
    return res.status(400).json(errorResponse(message));
  }
}

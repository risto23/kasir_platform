import type { Request, Response } from 'express';
import { errorResponse, successResponse } from '../../utils/api-response';
import { listAuditLogsQuerySchema } from './audit-logs.validation';
import { listAuditLogs } from './audit-logs.service';

export async function listAuditLogsController(req: Request, res: Response) {
  try {
    const parsed = listAuditLogsQuerySchema.parse({ query: req.query });
    const businessAccess = req.businessAccess;

    if (!businessAccess) {
      return res.status(400).json(errorResponse('Business context tidak tersedia'));
    }

    const result = await listAuditLogs(businessAccess, parsed.query);
    return res.json(successResponse('Audit logs fetched', result));
  } catch (error: unknown) {
    const statusCode =
      typeof error === 'object' &&
      error !== null &&
      'statusCode' in error &&
      typeof error.statusCode === 'number'
        ? error.statusCode
        : 400;
    const message =
      error instanceof Error ? error.message : 'Failed to fetch audit logs';

    return res.status(statusCode).json(errorResponse(message));
  }
}

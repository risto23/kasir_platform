import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import { listBusinessTypesService } from './platform-business-type.service';

export async function listBusinessTypesController(
  _req: Request,
  res: Response
) {
  try {
    const result = await listBusinessTypesService();
    return res.json(successResponse('Business types fetched', result));
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch business types';
    return res.status(500).json(errorResponse(message));
  }
}
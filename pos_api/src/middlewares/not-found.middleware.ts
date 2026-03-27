import { Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';

export function notFoundMiddleware(_req: Request, res: Response) {
  return res.status(404).json(errorResponse('Route not found'));
}
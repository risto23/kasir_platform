import { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';

export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  return res.status(err.statusCode || 500).json(
    errorResponse(err.message || 'Internal server error')
  );
}
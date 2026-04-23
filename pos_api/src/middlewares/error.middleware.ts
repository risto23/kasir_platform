import { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';
import { env } from '../config/env';

export function errorMiddleware(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  const statusCode = err.statusCode || 500;
  const message =
    env.nodeEnv === 'production' && statusCode >= 500
      ? 'Internal server error'
      : err.message || 'Internal server error';

  return res.status(err.statusCode || 500).json(
    errorResponse(message)
  );
}

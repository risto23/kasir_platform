// pos_api/src/middlewares/auth.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';
import { verifyAccessToken } from '../utils/jwt';

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyAccessToken(token);
    req.authUser = payload;
    return next();
  } catch {
    return res.status(401).json(errorResponse('Invalid or expired token'));
  }
}
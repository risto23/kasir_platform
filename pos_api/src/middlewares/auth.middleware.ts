// pos_api/src/middlewares/auth.middleware.ts
import { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';
import { verifyAccessToken } from '../utils/jwt';
import { AUTH_COOKIE_NAME } from '../utils/auth-cookie';

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.split(' ')[1] || null;
}

function getCookieToken(req: Request): string | null {
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[AUTH_COOKIE_NAME];

  return typeof token === 'string' && token.trim() !== '' ? token : null;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = getBearerToken(req) ?? getCookieToken(req);

  if (!token) {
    return res.status(401).json(errorResponse('Unauthorized'));
  }

  try {
    const payload = verifyAccessToken(token);
    req.authUser = payload;
    return next();
  } catch {
    return res.status(401).json(errorResponse('Invalid or expired token'));
  }
}

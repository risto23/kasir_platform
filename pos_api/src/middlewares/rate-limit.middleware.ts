import type { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  message?: string;
};

type ClientBucket = {
  count: number;
  resetAt: number;
};

function getClientKey(req: Request) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim() !== '') {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function createRateLimit(options: RateLimitOptions) {
  const buckets = new Map<string, ClientBucket>();

  return function rateLimitMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    const now = Date.now();
    const key = getClientKey(req);
    const current = buckets.get(key);

    if (!current || current.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + options.windowMs,
      });
      return next();
    }

    current.count += 1;

    if (current.count > options.maxRequests) {
      const retryAfterSeconds = Math.ceil((current.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res
        .status(429)
        .json(errorResponse(options.message ?? 'Terlalu banyak request'));
    }

    return next();
  };
}

export const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Terlalu banyak percobaan login. Coba lagi beberapa menit lagi.',
});

export const guestReadRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: 'Terlalu banyak request guest menu. Coba lagi sebentar.',
});

export const guestWriteRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Terlalu banyak percobaan membuat guest order. Coba lagi sebentar.',
});

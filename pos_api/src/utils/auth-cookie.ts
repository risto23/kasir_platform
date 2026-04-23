import type { Response } from 'express';
import { env } from '../config/env';

export const AUTH_COOKIE_NAME = 'pos_access_token';

type SameSiteOption = 'lax' | 'strict' | 'none';

function parseDurationToMs(value: string): number {
  const trimmed = value.trim();
  const match = /^(\d+)([smhd])?$/.exec(trimmed);

  if (!match) {
    return 24 * 60 * 60 * 1000;
  }

  const amount = Number(match[1]);
  const unit = match[2] ?? 's';

  switch (unit) {
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function getSameSite(): SameSiteOption {
  const configured = process.env.AUTH_COOKIE_SAMESITE?.toLowerCase();

  if (
    configured === 'lax' ||
    configured === 'strict' ||
    configured === 'none'
  ) {
    return configured;
  }

  return env.nodeEnv === 'production' ? 'lax' : 'lax';
}

export function setAuthCookie(res: Response, token: string) {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: getSameSite(),
    maxAge: parseDurationToMs(env.jwtExpiresIn),
    path: '/',
  });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: getSameSite(),
    path: '/',
  });
}

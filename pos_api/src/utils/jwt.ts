import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayloadUser } from '../types/auth';

export function signAccessToken(payload: JwtPayloadUser) {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });
}

export function verifyAccessToken(token: string): JwtPayloadUser {
  return jwt.verify(token, env.jwtSecret) as JwtPayloadUser;
}
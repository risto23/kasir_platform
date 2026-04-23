import jwt, { type Secret, type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayloadUser } from '../types/auth';

export function signAccessToken(payload: JwtPayloadUser) {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  };

  return jwt.sign(payload, env.jwtSecret as Secret, options);
}

export function verifyAccessToken(token: string): JwtPayloadUser {
  return jwt.verify(token, env.jwtSecret as Secret) as JwtPayloadUser;
}

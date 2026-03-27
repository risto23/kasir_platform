import { JwtPayloadUser } from './auth';

declare global {
  namespace Express {
    interface Request {
      authUser?: JwtPayloadUser;
    }
  }
}

export {};
import { PlatformRoleCode } from '@prisma/client';

export type JwtPayloadUser = {
  userId: string;
  email: string;
  platformRoles?: PlatformRoleCode[];
};
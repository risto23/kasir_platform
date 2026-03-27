import { Router } from 'express';
import { PlatformRoleCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePlatformRole } from '../../middlewares/role.middleware';
import { listBusinessTypesController } from './platform-business-type.controller';

const router = Router();

router.use(authMiddleware);
router.use(requirePlatformRole(PlatformRoleCode.SUPER_ADMIN));

router.get('/business-types', listBusinessTypesController);

export default router;
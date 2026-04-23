import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { listAuditLogsController } from './audit-logs.controller';
import { listAuditLogsQuerySchema } from './audit-logs.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  validate(listAuditLogsQuerySchema),
  requireBusinessPermission(BusinessPermissionCode.REPORT_VIEW),
  listAuditLogsController,
);

export default router;

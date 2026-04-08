import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { businessSalesQuerySchema, healthQuerySchema, outletSalesQuerySchema } from './reports.validation';
import { getBusinessSalesHandler, getOutletSalesHandler, getSalesHealthHandler } from './reports.controller';

const router = Router();

router.use(authMiddleware, businessAccessMiddleware);

router.get(
  '/sales/outlet',
  requireBusinessPermission(BusinessPermissionCode.REPORT_VIEW),
  requireOutletAccess((req) => (req.query?.outletId as string) || null),
  validate(outletSalesQuerySchema),
  getOutletSalesHandler,
);

router.get(
  '/sales/business',
  requireBusinessPermission(BusinessPermissionCode.REPORT_VIEW),
  validate(businessSalesQuerySchema),
  getBusinessSalesHandler,
);

router.get(
  '/sales/health',
  requireBusinessPermission(BusinessPermissionCode.REPORT_VIEW),
  validate(healthQuerySchema),
  getSalesHealthHandler,
);

export default router;
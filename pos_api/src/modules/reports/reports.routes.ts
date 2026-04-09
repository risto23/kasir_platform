import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { getItemsReportController, getOrdersReportController, getSalesSummaryController } from './reports.controller';
import { z } from 'zod';
import { itemsReportQuerySchema, ordersReportQuerySchema, salesSummaryQuerySchema } from './reports.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get('/sales-summary', requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW), validate(z.object({ query: salesSummaryQuerySchema })), getSalesSummaryController);
router.get('/orders', requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW), validate(z.object({ query: ordersReportQuerySchema })), getOrdersReportController);
router.get('/items', requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW), validate(z.object({ query: itemsReportQuerySchema })), getItemsReportController);

export default router;


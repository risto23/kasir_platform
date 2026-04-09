import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  stockSummaryQuerySchema,
  movementListQuerySchema,
  stockChangeBodySchema,
  stockAdjustmentBodySchema,
} from './inventory.validation';
import {
  adjustmentHandler,
  getMovementsHandler,
  getStockSummaryHandler,
  stockInHandler,
  stockOutHandler,
} from './inventory.controller';

const router = Router();

router.use(authMiddleware, businessAccessMiddleware);

router.get(
  '/stock-summary',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_VIEW),
  requireOutletAccess((req) => (req.query?.outletId as string) || null),
  validate(stockSummaryQuerySchema),
  getStockSummaryHandler,
);

router.get(
  '/movements',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_VIEW),
  requireOutletAccess((req) => (req.query?.outletId as string) || null),
  validate(movementListQuerySchema),
  getMovementsHandler,
);

router.post(
  '/movements/stock-in',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_STOCK_IN),
  requireOutletAccess((req) => (req.body?.outletId as string) || null),
  validate(stockChangeBodySchema),
  stockInHandler,
);

router.post(
  '/movements/stock-out',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_STOCK_OUT),
  requireOutletAccess((req) => (req.body?.outletId as string) || null),
  validate(stockChangeBodySchema),
  stockOutHandler,
);

router.post(
  '/adjustments',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_ADJUST),
  requireOutletAccess((req) => (req.body?.outletId as string) || null),
  validate(stockAdjustmentBodySchema),
  adjustmentHandler,
);

export default router;

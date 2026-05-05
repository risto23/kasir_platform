import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireFeatureFlag, requireFeatureFlagIfScope } from '../../middlewares/require-feature-flag.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getItemsReportController,
  getOrdersReportController,
  getSalesSummaryController,
  getSupplierPayablesReportController,
  exportSalesSummaryController,
  exportOrdersReportController,
  exportItemsReportController,
  exportSupplierPayablesReportController,
} from './reports.controller';
import { z } from 'zod';
import {
  itemsReportQuerySchema,
  ordersReportQuerySchema,
  salesSummaryQuerySchema,
  supplierPayablesReportQuerySchema,
} from './reports.validation';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

// scope=business on any report requires REPORT_SALES_MULTI_OUTLET
const requireMultiOutletScope = requireFeatureFlagIfScope('business', 'REPORT_SALES_MULTI_OUTLET');

// ── Sales Summary ─────────────────────────────────────────────────────────────

router.get(
  '/sales-summary',
  requireFeatureFlag('REPORT_SALES_SUMMARY'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: salesSummaryQuerySchema })),
  getSalesSummaryController,
);

router.get(
  '/sales-summary/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_SALES_SUMMARY'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: salesSummaryQuerySchema })),
  exportSalesSummaryController,
);

// ── Orders ────────────────────────────────────────────────────────────────────

router.get(
  '/orders',
  requireFeatureFlag('REPORT_ORDERS'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: ordersReportQuerySchema })),
  getOrdersReportController,
);

router.get(
  '/orders/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_ORDERS'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: ordersReportQuerySchema })),
  exportOrdersReportController,
);

// ── Items ─────────────────────────────────────────────────────────────────────

router.get(
  '/items',
  requireFeatureFlag('REPORT_ITEMS'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: itemsReportQuerySchema })),
  getItemsReportController,
);

router.get(
  '/items/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_ITEMS'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: itemsReportQuerySchema })),
  exportItemsReportController,
);

// ── Supplier Payables ─────────────────────────────────────────────────────────

router.get(
  '/supplier-payables',
  requireFeatureFlag('REPORT_SUPPLIER_PAYABLES'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  validate(z.object({ query: supplierPayablesReportQuerySchema })),
  getSupplierPayablesReportController,
);

router.get(
  '/supplier-payables/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_SUPPLIER_PAYABLES'),
  requireMultiOutletScope,
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  validate(z.object({ query: supplierPayablesReportQuerySchema })),
  exportSupplierPayablesReportController,
);

export default router;

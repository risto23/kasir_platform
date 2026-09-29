import { Router, type NextFunction, type Request, type Response } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireFeatureFlag, requireFeatureFlagIfScope } from '../../middlewares/require-feature-flag.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
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

const reportScopeQuerySchema = z.object({
  scope: z.enum(['business', 'outlet']).optional(),
  outletId: z.string().trim().optional(),
});

function resolveReportOutletId(req: Request): string | null {
  const parsed = reportScopeQuerySchema.safeParse(req.query);
  const outletId = parsed.success ? parsed.data.outletId : undefined;
  return outletId && outletId.length > 0 ? outletId : null;
}

const outletAccessGuard = requireOutletAccess(resolveReportOutletId);

// Outlet scope (the default) must name an outlet the user can access. Without
// this, an empty outletId skipped the outlet filter and returned every outlet,
// bypassing the REPORT_SALES_MULTI_OUTLET gate and outlet-level permissions.
function requireReportOutletScope(req: Request, res: Response, next: NextFunction) {
  const parsed = reportScopeQuerySchema.safeParse(req.query);
  const scope = parsed.success ? parsed.data.scope ?? 'outlet' : 'outlet';

  if (scope === 'business') {
    return next();
  }

  return outletAccessGuard(req, res, next);
}

// ── Sales Summary ─────────────────────────────────────────────────────────────

router.get(
  '/sales-summary',
  requireFeatureFlag('REPORT_SALES_SUMMARY'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: salesSummaryQuerySchema })),
  getSalesSummaryController,
);

router.get(
  '/sales-summary/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_SALES_SUMMARY'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: salesSummaryQuerySchema })),
  exportSalesSummaryController,
);

// ── Orders ────────────────────────────────────────────────────────────────────

router.get(
  '/orders',
  requireFeatureFlag('REPORT_ORDERS'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: ordersReportQuerySchema })),
  getOrdersReportController,
);

router.get(
  '/orders/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_ORDERS'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: ordersReportQuerySchema })),
  exportOrdersReportController,
);

// ── Items ─────────────────────────────────────────────────────────────────────

router.get(
  '/items',
  requireFeatureFlag('REPORT_ITEMS'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: itemsReportQuerySchema })),
  getItemsReportController,
);

router.get(
  '/items/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_ITEMS'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.ORDER_VIEW),
  validate(z.object({ query: itemsReportQuerySchema })),
  exportItemsReportController,
);

// ── Supplier Payables ─────────────────────────────────────────────────────────

router.get(
  '/supplier-payables',
  requireFeatureFlag('REPORT_SUPPLIER_PAYABLES'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  validate(z.object({ query: supplierPayablesReportQuerySchema })),
  getSupplierPayablesReportController,
);

router.get(
  '/supplier-payables/export',
  requireFeatureFlag('REPORT_EXPORT'),
  requireFeatureFlag('REPORT_SUPPLIER_PAYABLES'),
  requireMultiOutletScope,
  requireReportOutletScope,
  requireBusinessPermission(BusinessPermissionCode.SUPPLIER_VIEW),
  validate(z.object({ query: supplierPayablesReportQuerySchema })),
  exportSupplierPayablesReportController,
);

export default router;

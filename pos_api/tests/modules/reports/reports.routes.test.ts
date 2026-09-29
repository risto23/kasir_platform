import express, { type NextFunction, type Request, type Response } from 'express';
import request from 'supertest';
import reportsRoutes from '../../../src/modules/reports/reports.routes';

type FeatureFlagState = { enabled: boolean } | null;
type FeatureFlagStateGetter = (
  businessId: string,
  featureKey: string
) => Promise<FeatureFlagState>;

const getEffectiveBusinessFeatureFlagStateMock = jest.fn<
  ReturnType<FeatureFlagStateGetter>,
  Parameters<FeatureFlagStateGetter>
>();

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    outlet: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../../../src/modules/platform-feature-flag/platform-feature-flag.service', () => ({
  getEffectiveBusinessFeatureFlagState: (
    businessId: string,
    featureKey: string
  ) => getEffectiveBusinessFeatureFlagStateMock(businessId, featureKey),
}));

jest.mock('../../../src/middlewares/auth.middleware', () => ({
  authMiddleware: (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../../src/middlewares/business-access.middleware', () => ({
  businessAccessMiddleware: (req: Request, _res: Response, next: NextFunction) => {
    const requestWithBusinessAccess = req as Request & {
      businessAccess?: Request['businessAccess'];
    };

    requestWithBusinessAccess.businessAccess = {
      businessId: 'biz-1',
      businessUserId: 'business-user-1',
      role: null,
      permissions: [],
    };

    next();
  },
}));

jest.mock('../../../src/middlewares/require-business-permission.middleware', () => ({
  requireBusinessPermission:
    () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../../src/middlewares/require-outlet-access.middleware', () => ({
  requireOutletAccess:
    (resolveOutletId: (req: Request) => string | null) =>
    (req: Request, res: Response, next: NextFunction) => {
      const outletId = resolveOutletId(req);
      if (!outletId) {
        return res.status(400).json({ success: false, message: 'outletId wajib diisi' });
      }
      if (outletId === 'outlet-forbidden') {
        return res
          .status(403)
          .json({ success: false, message: 'Tidak memiliki akses ke outlet ini' });
      }
      return next();
    },
}));

jest.mock('../../../src/middlewares/validate.middleware', () => ({
  validate: () => (_req: Request, _res: Response, next: NextFunction) => next(),
}));

jest.mock('../../../src/modules/reports/reports.controller', () => ({
  getSalesSummaryController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'sales-summary' }),
  exportSalesSummaryController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'sales-summary-export' }),
  getOrdersReportController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'orders' }),
  exportOrdersReportController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'orders-export' }),
  getItemsReportController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'items' }),
  exportItemsReportController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'items-export' }),
  getSupplierPayablesReportController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'supplier-payables' }),
  exportSupplierPayablesReportController: (_req: Request, res: Response) =>
    res.status(200).json({ route: 'supplier-payables-export' }),
}));

const app = express();
app.use('/reports', reportsRoutes);

const enabledFeatureKeys = new Set<string>();

function allowFeatureFlags(...featureKeys: string[]) {
  enabledFeatureKeys.clear();
  for (const featureKey of featureKeys) {
    enabledFeatureKeys.add(featureKey);
  }
}

describe('reports.routes feature gating', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    allowFeatureFlags();

    getEffectiveBusinessFeatureFlagStateMock.mockImplementation(
      async (_businessId: string, featureKey: string) => ({
        enabled: enabledFeatureKeys.has(featureKey),
      })
    );
  });

  it.each([
    ['/sales-summary', 'REPORT_SALES_SUMMARY', 'sales-summary'],
    ['/orders', 'REPORT_ORDERS', 'orders'],
    ['/items', 'REPORT_ITEMS', 'items'],
    ['/supplier-payables', 'REPORT_SUPPLIER_PAYABLES', 'supplier-payables'],
  ])('returns 403 when %s is requested without %s', async (path, featureKey) => {
    const response = await request(app).get(`/reports${path}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: `Fitur ${featureKey} tidak aktif untuk business ini`,
    });
  });

  it.each([
    ['/sales-summary', 'REPORT_SALES_SUMMARY', 'sales-summary'],
    ['/orders', 'REPORT_ORDERS', 'orders'],
    ['/items', 'REPORT_ITEMS', 'items'],
    ['/supplier-payables', 'REPORT_SUPPLIER_PAYABLES', 'supplier-payables'],
  ])('returns 200 when %s is requested with %s', async (path, featureKey, route) => {
    allowFeatureFlags(featureKey);

    const response = await request(app)
      .get(`/reports${path}`)
      .query({ outletId: 'outlet-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route });
  });

  it.each([
    ['/sales-summary/export', 'REPORT_SALES_SUMMARY', 'sales-summary-export'],
    ['/orders/export', 'REPORT_ORDERS', 'orders-export'],
    ['/items/export', 'REPORT_ITEMS', 'items-export'],
    ['/supplier-payables/export', 'REPORT_SUPPLIER_PAYABLES', 'supplier-payables-export'],
  ])('returns 403 when %s is requested without REPORT_EXPORT', async (path, sourceFeatureKey) => {
    allowFeatureFlags(sourceFeatureKey);

    const response = await request(app).get(`/reports${path}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Fitur REPORT_EXPORT tidak aktif untuk business ini',
    });
  });

  it.each([
    ['/sales-summary/export', 'REPORT_SALES_SUMMARY'],
    ['/orders/export', 'REPORT_ORDERS'],
    ['/items/export', 'REPORT_ITEMS'],
    ['/supplier-payables/export', 'REPORT_SUPPLIER_PAYABLES'],
  ])('returns 403 when %s is requested without source report flag', async (path, sourceFeatureKey) => {
    allowFeatureFlags('REPORT_EXPORT');

    const response = await request(app).get(`/reports${path}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: `Fitur ${sourceFeatureKey} tidak aktif untuk business ini`,
    });
  });

  it.each([
    ['/sales-summary/export', 'REPORT_SALES_SUMMARY', 'sales-summary-export'],
    ['/orders/export', 'REPORT_ORDERS', 'orders-export'],
    ['/items/export', 'REPORT_ITEMS', 'items-export'],
    ['/supplier-payables/export', 'REPORT_SUPPLIER_PAYABLES', 'supplier-payables-export'],
  ])('returns 200 when %s has both REPORT_EXPORT and source report flag', async (path, sourceFeatureKey, route) => {
    allowFeatureFlags('REPORT_EXPORT', sourceFeatureKey);

    const response = await request(app)
      .get(`/reports${path}`)
      .query({ outletId: 'outlet-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route });
  });

  it('returns 403 for scope=business without REPORT_SALES_MULTI_OUTLET', async () => {
    allowFeatureFlags('REPORT_SALES_SUMMARY');

    const response = await request(app)
      .get('/reports/sales-summary')
      .query({ scope: 'business' });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      message: 'Fitur REPORT_SALES_MULTI_OUTLET tidak aktif untuk business ini',
    });
  });

  it('returns 200 for scope=business when REPORT_SALES_MULTI_OUTLET is enabled', async () => {
    allowFeatureFlags('REPORT_SALES_SUMMARY', 'REPORT_SALES_MULTI_OUTLET');

    const response = await request(app)
      .get('/reports/sales-summary')
      .query({ scope: 'business' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'sales-summary' });
  });

  it('does not require REPORT_SALES_MULTI_OUTLET for scope=outlet', async () => {
    allowFeatureFlags('REPORT_SALES_SUMMARY');

    const response = await request(app)
      .get('/reports/sales-summary')
      .query({ scope: 'outlet', outletId: 'outlet-1' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ route: 'sales-summary' });
  });

  it.each([
    ['/sales-summary', 'REPORT_SALES_SUMMARY'],
    ['/orders', 'REPORT_ORDERS'],
    ['/items', 'REPORT_ITEMS'],
    ['/supplier-payables', 'REPORT_SUPPLIER_PAYABLES'],
  ])('rejects %s with outlet scope but empty outletId (no all-outlet bypass)', async (path, featureKey) => {
    allowFeatureFlags(featureKey);

    const response = await request(app)
      .get(`/reports${path}`)
      .query({ scope: 'outlet', outletId: '' });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ success: false, message: 'outletId wajib diisi' });
  });

  it('rejects the default (outlet) scope when outletId is omitted', async () => {
    allowFeatureFlags('REPORT_SALES_SUMMARY');

    const response = await request(app).get('/reports/sales-summary');

    expect(response.status).toBe(400);
  });

  it('rejects outlet scope for an outlet the user cannot access', async () => {
    allowFeatureFlags('REPORT_SALES_SUMMARY');

    const response = await request(app)
      .get('/reports/sales-summary')
      .query({ scope: 'outlet', outletId: 'outlet-forbidden' });

    expect(response.status).toBe(403);
  });
});

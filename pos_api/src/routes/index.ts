// pos_api/src/routes/index.ts
import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import businessRoutes from '../modules/platform-business/platform-business.routes';
import outletRoutes from '../modules/platform-outlet/platform-outlet.routes';
import healthRoutes from '../modules/health/health.routes';
import platformFeatureFlagRoutes from '../modules/platform-feature-flag/platform-feature-flag.routes';
import platformBusinessTypeRoutes from '../modules/platform-business-type/platform-business-type.routes';
import businessReferenceRoutes from '../modules/business-reference/business-reference.routes';
import businessUserRoutes from '../modules/business-users/business-user.routes';
import productRoutes from '../modules/products/products.routes';
import productRouter from '../modules/business-product/product.routes';
import supplierRoutes from '../modules/suppliers/suppliers.routes';
import supplierProductRoutes from '../modules/supplier-products/supplier-products.routes';
import purchaseOrderRoutes from '../modules/purchase-orders/purchase-orders.routes';
import goodsReceiptRoutes from '../modules/goods-receipts/goods-receipts.routes';
import purchaseReturnRoutes from '../modules/purchase-returns/purchase-returns.routes';
import purchasePriceHistoryRoutes from '../modules/purchase-price-history/purchase-price-history.routes';
import supplierInvoiceRoutes from '../modules/supplier-invoices/supplier-invoices.routes';
import supplierCreditRoutes from '../modules/supplier-credits/supplier-credits.routes';
import promoRoutes from '../modules/promos/promo.routes';
import orderRoutes from '../modules/orders/order.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import inventoryRoutes from '../modules/inventory/inventory.routes';
import stockOpnameRoutes from '../modules/stock-opname/stock-opname.routes';
import kitchenRoutes from '../modules/kitchen/kitchen.routes';
import receiptRoutes from '../modules/receipts/receipt.routes';

import guestRoutes from '../modules/guest/guest.routes';



import posSettingsRoutes from '../modules/pos-settings/pos-settings.routes';
import businessSettingsRoutes from '../modules/business-settings/business-settings.routes';
import outletSettingsRoutes from '../modules/outlet-settings/outlet-settings.routes';
import receiptSettingsRoutes from '../modules/receipt-settings/receipt-settings.routes';
import reportsRoutes from '../modules/reports/reports.routes';
import auditLogsRoutes from '../modules/audit-logs/audit-logs.routes';

import restaurantOperationsRoutes from '../modules/restaurant-operations/restaurant-operations.routes';
import outletPaymentMethodRoutes from '../modules/outlet-payment-methods/outlet-payment-methods.routes';
import businessFeatureFlagRoutes from '../modules/business-feature-flag/business-feature-flag.routes';
import subscriptionRoutes from '../modules/subscriptions/subscriptions.routes';
import subscriptionPlanRoutes from '../modules/subscriptions/subscription-plans.routes';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/platform/businesses', businessRoutes);
router.use('/platform/outlets', outletRoutes);
router.use('/platform/feature-flags', platformFeatureFlagRoutes);
router.use('/platform', platformBusinessTypeRoutes);
router.use('/business', businessReferenceRoutes);
router.use('/business', businessFeatureFlagRoutes);
router.use('/business-users', businessUserRoutes);
router.use('/products', productRoutes);
router.use('/business/products', productRouter);
router.use('/suppliers', supplierRoutes);
router.use('/suppliers', supplierProductRoutes);
router.use('/purchase-orders', purchaseOrderRoutes);
router.use('/goods-receipts', goodsReceiptRoutes);
router.use('/purchase-returns', purchaseReturnRoutes);
router.use('/purchase-price-history', purchasePriceHistoryRoutes);
router.use('/supplier-invoices', supplierInvoiceRoutes);
router.use('/supplier-credits', supplierCreditRoutes);
router.use('/promos', promoRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/stock-opname', stockOpnameRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/platform/subscription-plans', subscriptionPlanRoutes);

router.use('/reports', reportsRoutes);
router.use('/audit-logs', auditLogsRoutes);
router.use('/settings', posSettingsRoutes);
router.use('/settings', businessSettingsRoutes);
router.use('/settings', outletSettingsRoutes);
router.use('/settings', receiptSettingsRoutes);
router.use('/outlets', outletPaymentMethodRoutes);
router.use('/receipts', receiptRoutes);

// public guest routes harus dipasang lebih dulu
router.use('/', guestRoutes);

// protected root routes
router.use('/', kitchenRoutes);
router.use('/', restaurantOperationsRoutes);

export default router;


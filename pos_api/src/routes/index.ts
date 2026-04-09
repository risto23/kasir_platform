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
import promoRoutes from '../modules/promos/promo.routes';
import orderRoutes from '../modules/orders/order.routes';
import paymentRoutes from '../modules/payments/payment.routes';
import kitchenRoutes from '../modules/kitchen/kitchen.routes';
import receiptRoutes from '../modules/receipts/receipt.routes';

import guestRoutes from '../modules/guest/guest.routes';



import posSettingsRoutes from '../modules/pos-settings/pos-settings.routes';
import reportsRoutes from '../modules/reports/reports.routes';

import restaurantOperationsRoutes from '../modules/restaurant-operations/restaurant-operations.routes';
import businessFeatureFlagRoutes from '../modules/business-feature-flag/business-feature-flag.routes';

import reportsRoutes from '../modules/reports/reports.routes';

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
router.use('/promos', promoRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);

router.use('/reports', reportsRoutes);
router.use('/settings', posSettingsRoutes);
router.use('/receipts', receiptRoutes);

router.use('/reports', reportsRoutes);

// public guest routes harus dipasang lebih dulu
router.use('/', guestRoutes);

// protected root routes
router.use('/', kitchenRoutes);
router.use('/', restaurantOperationsRoutes);

export default router;


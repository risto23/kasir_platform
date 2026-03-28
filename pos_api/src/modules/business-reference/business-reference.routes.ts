// pos_api/src/modules/business-reference/business-reference.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import {
  getBusinessPermissionsController,
  getBusinessRolesController,
} from './business-reference.controller';
import businessUsersRoutes from '../business-users/business-user.routes';
import outletsRoutes from '../outlets/outlets.routes';
import categoryRoutes from '../categories/categories.routes';
import productOutletSettingRoutes from '../product-outlet-settings/product-outlet-settings.routes'
import productRoutes from '../products/products.routes';
import outletTables from '../outlet-tables/outlet-tables.routes';



const router = Router();

router.get(
  '/roles',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_ROLE_VIEW'),
  getBusinessRolesController,
);

router.get(
  '/permissions',
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessPermission('BUSINESS_PERMISSION_VIEW'),
  getBusinessPermissionsController,
);

router.use('/users', businessUsersRoutes);
router.use('/outlets', outletsRoutes);
router.use('/categories', categoryRoutes);
router.use('/product-outlet-settings', productOutletSettingRoutes);
router.use('/products', productRoutes);
router.use('/outlets-tables', outletTables);

export default router;
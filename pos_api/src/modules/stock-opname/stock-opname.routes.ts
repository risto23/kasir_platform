import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createOpnameBodySchema,
  listOpnameQuerySchema,
  opnameIdParamSchema,
  updateItemsBodySchema,
  finalizeBodySchema,
} from './stock-opname.validation';
import {
  createOpnameHandler,
  listOpnameHandler,
  getOpnameDetailHandler,
  updateOpnameItemsHandler,
  finalizeOpnameHandler,
  cancelOpnameHandler,
} from './stock-opname.controller';

const router = Router();

router.use(authMiddleware, businessAccessMiddleware);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_OPNAME),
  requireOutletAccess((req) => (req.body?.outletId as string) || null),
  validate(createOpnameBodySchema),
  createOpnameHandler,
);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_OPNAME),
  validate(listOpnameQuerySchema),
  listOpnameHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_OPNAME),
  validate(opnameIdParamSchema),
  getOpnameDetailHandler,
);

router.put(
  '/:id/items',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_OPNAME),
  validate(updateItemsBodySchema),
  updateOpnameItemsHandler,
);

router.post(
  '/:id/finalize',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_OPNAME),
  validate(finalizeBodySchema),
  finalizeOpnameHandler,
);

router.post(
  '/:id/cancel',
  requireBusinessPermission(BusinessPermissionCode.INVENTORY_OPNAME),
  validate(opnameIdParamSchema),
  cancelOpnameHandler,
);

export default router;

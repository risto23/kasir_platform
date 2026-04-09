import { Router, type Request } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { BusinessPermissionCode } from '@prisma/client';
import { validate } from '../../middlewares/validate.middleware';
import { getPosChargesController, putPosChargesController } from './pos-settings.controller';
import { getPosChargesQuerySchema, putPosChargesBodySchema } from './pos-settings.validation';

function resolveOutletIdFromQuery(req: Request): string | null {
  const outletId = typeof req.query.outletId === 'string' ? req.query.outletId : '';
  return outletId && outletId.trim() !== '' ? outletId.trim() : null;
}

function resolveOutletIdFromBody(req: Request): string | null {
  const outletId = typeof (req.body?.outletId) === 'string' ? req.body.outletId : '';
  return outletId && outletId.trim() !== '' ? outletId.trim() : null;
}

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/pos-charges',
  validate(getPosChargesQuerySchema),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_VIEW),
  requireOutletAccess(resolveOutletIdFromQuery),
  getPosChargesController,
);

router.put(
  '/pos-charges',
  validate(putPosChargesBodySchema),
  requireBusinessPermission(BusinessPermissionCode.OUTLET_UPDATE),
  requireOutletAccess(resolveOutletIdFromBody),
  putPosChargesController,
);

export default router;

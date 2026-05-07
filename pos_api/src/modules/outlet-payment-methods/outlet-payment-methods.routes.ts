import { Router, type Request } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireOutletAccess } from '../../middlewares/require-outlet-access.middleware';
import {
  createOutletPaymentMethodHandler,
  deleteOutletPaymentMethodHandler,
  listOutletPaymentMethodsHandler,
  updateOutletPaymentMethodHandler,
} from './outlet-payment-methods.controller';

const router = Router();

function resolveOutletId(req: Request): string | undefined {
  const id = req.params.outletId;
  return Array.isArray(id) ? id[0] : id;
}

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get('/:outletId/payment-methods', requireOutletAccess(resolveOutletId), listOutletPaymentMethodsHandler);
router.post('/:outletId/payment-methods', requireOutletAccess(resolveOutletId), createOutletPaymentMethodHandler);
router.put('/:outletId/payment-methods/:id', requireOutletAccess(resolveOutletId), updateOutletPaymentMethodHandler);
router.delete('/:outletId/payment-methods/:id', requireOutletAccess(resolveOutletId), deleteOutletPaymentMethodHandler);

export default router;

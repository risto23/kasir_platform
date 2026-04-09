import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { getBusinessFeatureFlagsService } from '../platform-feature-flag/platform-feature-flag.service';
import { successResponse, errorResponse } from '../../utils/api-response';

const router = Router();

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get('/feature-flags', async (req, res) => {
  try {
    const businessId = req.businessAccess?.businessId;
    if (!businessId) {
      return res.status(400).json(errorResponse('Business context tidak tersedia'));
    }

    const result = await getBusinessFeatureFlagsService(businessId);
    return res.json(successResponse('Business feature flags fetched', result));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Gagal memuat feature flags';
    return res.status(500).json(errorResponse(message));
  }
});

export default router;

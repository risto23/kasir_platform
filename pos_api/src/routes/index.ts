import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes';
import businessRoutes from '../modules/platform-business/platform-business.routes';
import outletRoutes from '../modules/platform-outlet/platform-outlet.routes';
import healthRoutes from '../modules/health/health.routes';
import platformFeatureFlagRoutes from '../modules/platform-feature-flag/platform-feature-flag.routes';
import platformBusinessTypeRoutes from '../modules/platform-business-type/platform-business-type.routes';



const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/platform/businesses', businessRoutes);
router.use('/platform/outlets', outletRoutes);
router.use('/platform/feature-flags', platformFeatureFlagRoutes);
router.use('/platform', platformBusinessTypeRoutes);

export default router;
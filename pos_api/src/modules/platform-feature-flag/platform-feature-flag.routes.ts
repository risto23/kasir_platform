import { Router } from 'express';
import { PlatformRoleCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePlatformRole } from '../../middlewares/role.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  getBusinessFeatureFlagsController,
  getBusinessFeatureFlagAuditLogsController,
  getBusinessesFeatureSummaryController,
  getPlanFeatureFlagsController,
  getPlansFeatureMatrixController,
  getPlatformAuditLogsController,
  listFeatureFlagsController,
  overrideBusinessFeatureFlagController,
  setPlanFeatureFlagsController,
  updateBusinessFeatureFlagsController,
} from './platform-feature-flag.controller';
import {
  businessFeatureFlagParamSchema,
  overrideBusinessFeatureFlagSchema,
  planFeatureFlagParamSchema,
  setPlanFeatureFlagsSchema,
  updateBusinessFeatureFlagsSchema,
} from './platform-feature-flag.validation';

// Mounted at /platform/feature-flags
const router = Router();

router.use(authMiddleware);
router.use(requirePlatformRole(PlatformRoleCode.SUPER_ADMIN));

// GET  /platform/feature-flags                  — list all master feature flags
router.get('/', listFeatureFlagsController);

// GET  /platform/feature-flags/plans-matrix     — all plans × flags in one call
router.get('/plans-matrix', getPlansFeatureMatrixController);

// GET  /platform/feature-flags/plans/:planId    — feature flags for a plan
// PUT  /platform/feature-flags/plans/:planId    — set feature flags for a plan
router.get(
  '/plans/:planId',
  validate(planFeatureFlagParamSchema),
  getPlanFeatureFlagsController
);
router.put(
  '/plans/:planId',
  validate(setPlanFeatureFlagsSchema),
  setPlanFeatureFlagsController
);

// GET  /platform/feature-flags/businesses-summary  — all businesses feature stats
router.get('/businesses-summary', getBusinessesFeatureSummaryController);

// GET  /platform/feature-flags/platform-audit-logs
router.get('/platform-audit-logs', getPlatformAuditLogsController);

// GET  /platform/feature-flags/businesses/:id/feature-flags  (existing — bulk view)
// PUT  /platform/feature-flags/businesses/:id/feature-flags  (existing — bulk replace)
router.get(
  '/businesses/:id/feature-flags',
  validate(businessFeatureFlagParamSchema),
  getBusinessFeatureFlagsController
);
router.put(
  '/businesses/:id/feature-flags',
  validate(updateBusinessFeatureFlagsSchema),
  updateBusinessFeatureFlagsController
);

// PATCH /platform/feature-flags/businesses/:id/feature-override  — single flag with reason
router.patch(
  '/businesses/:id/feature-override',
  validate(overrideBusinessFeatureFlagSchema),
  overrideBusinessFeatureFlagController
);

// GET  /platform/feature-flags/businesses/:id/audit-logs  — audit history per business
router.get(
  '/businesses/:id/audit-logs',
  validate(businessFeatureFlagParamSchema),
  getBusinessFeatureFlagAuditLogsController
);

export default router;

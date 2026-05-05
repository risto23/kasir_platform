import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma';
import { getEffectiveBusinessFeatureFlagState } from '../modules/platform-feature-flag/platform-feature-flag.service';

async function isFeatureEnabledForBusiness(
  businessId: string,
  featureKey: string
): Promise<boolean> {
  const featureState = await getEffectiveBusinessFeatureFlagState(businessId, featureKey);
  return featureState?.enabled ?? false;
}

async function isOutletFeatureEnabled(
  outletId: string,
  featureKey: string
): Promise<boolean> {
  if (featureKey !== 'GUEST_QR') {
    return true;
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: {
      setting: {
        select: {
          guestQrEnabled: true,
        },
      },
    },
  });

  if (!outlet) {
    return false;
  }

  return outlet.setting?.guestQrEnabled ?? true;
}

export function requireFeatureFlag(featureKey: string) {
  return async function featureFlagGuard(req: Request, res: Response, next: NextFunction) {
    try {
      const businessId = req.businessAccess?.businessId;

      if (!businessId) {
        return res.status(400).json({ success: false, message: 'Business context tidak tersedia' });
      }

      const enabled = await isFeatureEnabledForBusiness(businessId, featureKey);
      if (!enabled) {
        return res
          .status(403)
          .json({ success: false, message: `Fitur ${featureKey} tidak aktif untuk business ini` });
      }

      return next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memeriksa feature flag';
      return res.status(500).json({ success: false, message });
    }
  };
}

export function requireFeatureFlagIfScope(scope: string, featureKey: string) {
  return function scopedFeatureFlagGuard(req: Request, res: Response, next: NextFunction) {
    if (req.query.scope === scope) {
      return requireFeatureFlag(featureKey)(req, res, next);
    }
    return next();
  };
}

export function requireFeatureFlagForOutletParam(
  featureKey: string,
  resolveOutletId: (req: Request) => string | null
) {
  return async function featureFlagGuard(req: Request, res: Response, next: NextFunction) {
    try {
      const outletId = resolveOutletId(req);
      if (!outletId) {
        return res.status(400).json({ success: false, message: 'Outlet tidak valid' });
      }

      const outlet = await prisma.outlet.findUnique({
        where: { id: outletId },
        select: { businessId: true },
      });

      if (!outlet) {
        return res.status(404).json({ success: false, message: 'Outlet tidak ditemukan' });
      }

      const enabled = await isFeatureEnabledForBusiness(outlet.businessId, featureKey);
      if (!enabled) {
        return res
          .status(403)
          .json({ success: false, message: `Fitur ${featureKey} tidak aktif untuk business ini` });
      }

      const outletEnabled = await isOutletFeatureEnabled(outletId, featureKey);
      if (!outletEnabled) {
        return res.status(403).json({
          success: false,
          message: `${featureKey} belum aktif untuk outlet ini`,
        });
      }

      return next();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Gagal memeriksa feature flag';
      return res.status(500).json({ success: false, message });
    }
  };
}

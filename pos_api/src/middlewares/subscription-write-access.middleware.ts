import { NextFunction, Request, Response } from 'express';
import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { errorResponse } from '../utils/api-response';

type SubscriptionBlockedAction =
  | 'CREATE_OUTLET'
  | 'UPDATE_OUTLET'
  | 'UPDATE_OUTLET_STATUS'
  | 'CREATE_BUSINESS_USER'
  | 'UPDATE_BUSINESS_USER'
  | 'UPDATE_BUSINESS_USER_STATUS'
  | 'UPDATE_BUSINESS_USER_OUTLET_ACCESS'
  | 'CREATE_PRODUCT'
  | 'UPDATE_PRODUCT'
  | 'UPDATE_PRODUCT_STATUS'
  | 'CREATE_ORDER'
  | 'ADD_ORDER_ITEM'
  | 'UPDATE_ORDER_ITEM'
  | 'UPDATE_ORDER_STATUS'
  | 'CREATE_PAYMENT';

type SuspendedSubscriptionPayload = {
  code: 'SUBSCRIPTION_WRITE_BLOCKED';
  blockedAction: SubscriptionBlockedAction;
  plan: {
    id: string;
    code: string;
    name: string;
  };
  subscription: {
    id: string;
    status: SubscriptionStatus;
    currentPeriodEnd: string;
    graceEndsAt: string | null;
    suspendedAt: string | null;
  };
  suggestion: string;
};

const WRITE_BLOCKED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.SUSPENDED,
  SubscriptionStatus.CANCELLED,
];

function buildSuspendedMessage(status: SubscriptionStatus) {
  if (status === SubscriptionStatus.CANCELLED) {
    return 'Subscription business ini sudah tidak aktif. Akses write diblokir sampai subscription diaktifkan kembali.';
  }

  return 'Subscription business ini sedang suspended. Akses write diblokir sampai invoice subscription diselesaikan.';
}

export function requireSubscriptionWriteAccess(
  blockedAction: SubscriptionBlockedAction,
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const businessAccess = req.businessAccess;

      if (!businessAccess) {
        return res
          .status(403)
          .json(errorResponse('Business access context belum tersedia'));
      }

      const subscription = await prisma.businessSubscription.findFirst({
        where: {
          businessId: businessAccess.businessId,
          status: {
            in: [
              SubscriptionStatus.TRIAL,
              SubscriptionStatus.ACTIVE,
              SubscriptionStatus.PAST_DUE,
              SubscriptionStatus.SUSPENDED,
              SubscriptionStatus.CANCELLED,
            ],
          },
        },
        include: {
          plan: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
        orderBy: [
          {
            currentPeriodEnd: 'desc',
          },
          {
            createdAt: 'desc',
          },
        ],
      });

      if (!subscription) {
        return next();
      }

      if (!WRITE_BLOCKED_STATUSES.includes(subscription.status)) {
        return next();
      }

      const errors: SuspendedSubscriptionPayload = {
        code: 'SUBSCRIPTION_WRITE_BLOCKED',
        blockedAction,
        plan: {
          id: subscription.plan.id,
          code: subscription.plan.code,
          name: subscription.plan.name,
        },
        subscription: {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: subscription.currentPeriodEnd.toISOString(),
          graceEndsAt: subscription.graceEndsAt?.toISOString() ?? null,
          suspendedAt: subscription.suspendedAt?.toISOString() ?? null,
        },
        suggestion:
          'Buka halaman billing subscription dan catat pembayaran invoice overdue untuk mengaktifkan kembali akses write.',
      };

      return res
        .status(403)
        .json(errorResponse(buildSuspendedMessage(subscription.status), errors));
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Gagal memverifikasi status subscription write access';

      return res.status(500).json(errorResponse(message));
    }
  };
}

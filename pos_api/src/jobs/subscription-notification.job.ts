import { SubscriptionStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { sendMail } from '../utils/mailer';

const NOTIFICATION_THRESHOLDS_DAYS = [7, 3, 1];
const MS_PER_DAY = 24 * 60 * 60 * 1000;

let notificationJobTimer: NodeJS.Timeout | null = null;

function buildExpiryEmailHtml(params: {
  businessName: string;
  planName: string;
  periodEnd: Date;
  daysLeft: number;
  appName: string;
  appOrigin: string;
}) {
  const periodEndStr = params.periodEnd.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #1a1a1a;">Pemberitahuan Berakhirnya Langganan</h2>
      <p>Halo,</p>
      <p>
        Langganan <strong>${params.planName}</strong> untuk bisnis
        <strong>${params.businessName}</strong> akan berakhir dalam
        <strong>${params.daysLeft} hari</strong> lagi, tepatnya pada
        <strong>${periodEndStr}</strong>.
      </p>
      <p>
        Segera lakukan pembayaran perpanjangan agar bisnis Anda tidak terganggu.
      </p>
      <div style="margin: 32px 0;">
        <a
          href="${params.appOrigin}"
          style="background: #2563eb; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;"
        >
          Perpanjang Sekarang
        </a>
      </div>
      <p style="color: #666; font-size: 12px;">
        Email ini dikirim otomatis oleh ${params.appName}. Harap tidak membalas email ini.
      </p>
    </div>
  `;
}

async function sendExpiryNotificationsForThreshold(daysLeft: number, now: Date) {
  const windowStart = new Date(now.getTime() + daysLeft * MS_PER_DAY);
  const windowEnd = new Date(windowStart.getTime() + MS_PER_DAY);

  const subscriptions = await prisma.businessSubscription.findMany({
    where: {
      status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL] },
      cancelAtPeriodEnd: false,
      currentPeriodEnd: {
        gte: windowStart,
        lt: windowEnd,
      },
    },
    include: {
      business: {
        select: {
          name: true,
          ownerUser: { select: { email: true } },
          businessUsers: {
            where: { isPrimary: true },
            include: { user: { select: { email: true } } },
            take: 1,
          },
        },
      },
      plan: { select: { name: true } },
    },
  });

  let sentCount = 0;

  for (const sub of subscriptions) {
    const recipientEmail =
      sub.business.ownerUser?.email ??
      sub.business.businessUsers[0]?.user?.email;

    if (!recipientEmail) {
      continue;
    }

    const notificationType = `EXPIRING_${daysLeft}_DAYS`;

    const alreadySent = await prisma.subscriptionNotificationLog.findUnique({
      where: {
        subscriptionId_notificationType_periodEnd: {
          subscriptionId: sub.id,
          notificationType,
          periodEnd: sub.currentPeriodEnd,
        },
      },
      select: { id: true },
    });

    if (alreadySent) {
      continue;
    }

    try {
      await sendMail({
        to: recipientEmail,
        subject: `Langganan ${sub.plan.name} akan berakhir dalam ${daysLeft} hari`,
        html: buildExpiryEmailHtml({
          businessName: sub.business.name,
          planName: sub.plan.name,
          periodEnd: sub.currentPeriodEnd,
          daysLeft,
          appName: env.appName,
          appOrigin: env.appOrigin,
        }),
      });

      await prisma.subscriptionNotificationLog.create({
        data: {
          subscriptionId: sub.id,
          notificationType,
          periodEnd: sub.currentPeriodEnd,
          recipientEmail,
        },
      });

      sentCount += 1;
    } catch (err) {
      console.error(
        `[subscription-notification.job] failed to send ${notificationType} for subscription ${sub.id}`,
        err,
      );
    }
  }

  return sentCount;
}

async function executeSubscriptionNotifications() {
  const now = new Date();

  try {
    let totalSent = 0;

    for (const days of NOTIFICATION_THRESHOLDS_DAYS) {
      const sent = await sendExpiryNotificationsForThreshold(days, now);
      totalSent += sent;
    }

    if (totalSent > 0) {
      console.log(`[subscription-notification.job] sent ${totalSent} notification(s)`);
    }
  } catch (err) {
    console.error('[subscription-notification.job] cycle failed', err);
  }
}

export function startSubscriptionNotificationJob() {
  if (!env.subscriptionNotificationJobEnabled) {
    console.log('[subscription-notification.job] disabled');
    return;
  }

  if (notificationJobTimer) {
    return;
  }

  void executeSubscriptionNotifications();

  notificationJobTimer = setInterval(() => {
    void executeSubscriptionNotifications();
  }, env.subscriptionNotificationJobIntervalMs);

  console.log(
    `[subscription-notification.job] started interval=${env.subscriptionNotificationJobIntervalMs}ms thresholds=${NOTIFICATION_THRESHOLDS_DAYS.join(',')}d`,
  );
}

export function stopSubscriptionNotificationJob() {
  if (!notificationJobTimer) {
    return;
  }

  clearInterval(notificationJobTimer);
  notificationJobTimer = null;
}

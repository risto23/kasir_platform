import { env } from '../config/env';
import { runSubscriptionBillingCycle } from '../modules/subscriptions/subscription-billing.service';

let billingJobTimer: NodeJS.Timeout | null = null;

async function executeSubscriptionBillingCycle() {
  try {
    const result = await runSubscriptionBillingCycle({
      leadDays: env.subscriptionBillingRenewalLeadDays,
      graceDays: env.subscriptionBillingGraceDays,
    });

    if (
      result.generatedCount > 0 ||
      result.overdueMarkedCount > 0 ||
      result.activatedRenewalCount > 0 ||
      result.appliedScheduledChangeCount > 0 ||
      result.cancelledAtPeriodEndCount > 0 ||
      result.pastDueCount > 0 ||
      result.suspendedCount > 0
    ) {
      console.log('[subscription-billing.job] cycle completed', result);
    }
  } catch (error: unknown) {
    console.error('[subscription-billing.job] cycle failed', error);
  }
}

export function startSubscriptionRenewalJob() {
  if (!env.subscriptionBillingJobEnabled) {
    console.log('[subscription-billing.job] disabled');
    return;
  }

  if (billingJobTimer) {
    return;
  }

  void executeSubscriptionBillingCycle();

  billingJobTimer = setInterval(() => {
    void executeSubscriptionBillingCycle();
  }, env.subscriptionBillingJobIntervalMs);

  console.log(
    `[subscription-billing.job] started interval=${env.subscriptionBillingJobIntervalMs}ms leadDays=${env.subscriptionBillingRenewalLeadDays} graceDays=${env.subscriptionBillingGraceDays}`,
  );
}

export function stopSubscriptionRenewalJob() {
  if (!billingJobTimer) {
    return;
  }

  clearInterval(billingJobTimer);
  billingJobTimer = null;
}

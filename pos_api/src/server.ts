import app from './app';
import { env } from './config/env';
import { startSubscriptionRenewalJob } from './jobs/subscription-renewal.job';
import { startSubscriptionNotificationJob } from './jobs/subscription-notification.job';

console.log('[server.ts] starting server');

app.listen(env.port, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${env.port}`);
  startSubscriptionRenewalJob();
  startSubscriptionNotificationJob();
});

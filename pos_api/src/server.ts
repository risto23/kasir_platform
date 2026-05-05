import app from './app';
import { env } from './config/env';
import { startSubscriptionRenewalJob } from './jobs/subscription-renewal.job';
import { startSubscriptionNotificationJob } from './jobs/subscription-notification.job';

console.log('[server.ts] starting server');

const host = process.env.HOST || '0.0.0.0';

app.listen(env.port, host, () => {
  console.log(`Server running on http://${host}:${env.port}`);
  startSubscriptionRenewalJob();
  startSubscriptionNotificationJob();
});

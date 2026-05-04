import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV || 'development';
const jwtSecret = process.env.JWT_SECRET || 'change-me';

if (nodeEnv === 'production') {
  const missingValues = [
    !process.env.DATABASE_URL ? 'DATABASE_URL' : null,
    !process.env.JWT_SECRET ? 'JWT_SECRET' : null,
    !process.env.GUEST_QR_SECRET ? 'GUEST_QR_SECRET' : null,
  ].filter(Boolean);

  if (missingValues.length > 0) {
    throw new Error(`Missing required production env: ${missingValues.join(', ')}`);
  }

  if (jwtSecret === 'change-me' || jwtSecret.length < 32) {
    throw new Error('JWT_SECRET production harus unik dan minimal 32 karakter.');
  }

  if ((process.env.GUEST_QR_SECRET ?? '').length < 32) {
    throw new Error('GUEST_QR_SECRET production harus unik dan minimal 32 karakter.');
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv,
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
  subscriptionBillingJobEnabled:
    process.env.SUBSCRIPTION_BILLING_JOB_ENABLED !== undefined
      ? process.env.SUBSCRIPTION_BILLING_JOB_ENABLED === 'true'
      : nodeEnv !== 'test',
  subscriptionBillingJobIntervalMs: Number(
    process.env.SUBSCRIPTION_BILLING_JOB_INTERVAL_MS || 60 * 60 * 1000,
  ),
  subscriptionBillingRenewalLeadDays: Number(
    process.env.SUBSCRIPTION_BILLING_RENEWAL_LEAD_DAYS || 7,
  ),
  subscriptionBillingGraceDays: Number(
    process.env.SUBSCRIPTION_BILLING_GRACE_DAYS || 7,
  ),
  subscriptionNotificationJobEnabled:
    process.env.SUBSCRIPTION_NOTIFICATION_JOB_ENABLED !== undefined
      ? process.env.SUBSCRIPTION_NOTIFICATION_JOB_ENABLED === 'true'
      : nodeEnv !== 'test',
  subscriptionNotificationJobIntervalMs: Number(
    process.env.SUBSCRIPTION_NOTIFICATION_JOB_INTERVAL_MS || 60 * 60 * 1000,
  ),
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: Number(process.env.SMTP_PORT || 465),
  smtpSecure: process.env.SMTP_SECURE !== 'false',
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  smtpFrom: process.env.SMTP_FROM || process.env.SMTP_USER || '',
  appName: process.env.APP_NAME || 'POS Platform',
};

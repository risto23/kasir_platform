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
};

import 'dotenv/config';

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  jwtSecret: process.env.JWT_SECRET || 'change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
  appOrigin: process.env.APP_ORIGIN || 'http://localhost:3000',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS || 10),
};
import 'dotenv/config';

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

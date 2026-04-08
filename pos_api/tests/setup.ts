process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:3000';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/testdb?schema=public';

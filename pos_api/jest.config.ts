import type { Config } from 'jest';

const min = Number(process.env.COVERAGE_MIN ?? '70');
const enforce = process.env.COVERAGE_ENFORCE === 'true';

const base: Config = {
  preset: 'ts-jest',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/app.ts',
    'src/middlewares/**/*.ts',
    'src/utils/**/*.ts',
    'src/modules/auth/**/*.ts',
    'src/modules/products/**/*.ts',
    'src/modules/platform-business/**/*.ts',
    'src/modules/orders/**/*.ts',
    'src/modules/payments/**/*.ts',
    'src/modules/receipts/**/*.ts',
  ],
  coverageReporters: ['text', 'lcov'],
};

const config: Config = enforce
  ? {
      ...base,
      collectCoverage: true,
      coverageThreshold: {
        global: {
          branches: min,
          functions: min,
          lines: min,
          statements: min,
        },
      },
    }
  : base;

export default config;

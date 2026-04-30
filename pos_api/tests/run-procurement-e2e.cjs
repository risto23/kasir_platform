const { spawnSync } = require('node:child_process');

const jestBin = require.resolve('jest/bin/jest');

const procurementSuites = [
  'tests/e2e/suppliers.e2e.test.ts',
  'tests/e2e/purchase-orders.e2e.test.ts',
  'tests/e2e/goods-receipts.e2e.test.ts',
  'tests/e2e/purchase-returns.e2e.test.ts',
  'tests/e2e/supplier-invoices.e2e.test.ts',
  'tests/e2e/purchase-price-history.e2e.test.ts',
];

const result = spawnSync(
  process.execPath,
  [jestBin, '--ci', '--runInBand', ...procurementSuites],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DB_E2E: 'true',
    },
  },
);

process.exit(result.status ?? 1);

const { spawnSync } = require('node:child_process');

const jestBin = require.resolve('jest/bin/jest');

const result = spawnSync(
  process.execPath,
  [jestBin, '--ci', '--runInBand', 'tests/e2e'],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DB_E2E: 'true',
    },
  },
);

process.exit(result.status ?? 1);

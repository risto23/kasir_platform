# Testing Documentation

## Ringkasan

Testing dipisah antara backend (`pos_api`) dan frontend (`pos_web`).

## API Testing (`pos_api`)

### Tools

- Jest
- ts-jest
- Supertest

### Script

```bash
npm run test
npm run test:run
npm run test:watch
```

### E2E DB-backed

Aktifkan dengan env:

```bash
DB_E2E=true npm run test:run
```

Sebelum E2E:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

### Coverage

Opsional enforce threshold:

```bash
COVERAGE_ENFORCE=true COVERAGE_MIN=70 npm run test:run
```

## Web Testing (`pos_web`)

### Tools

- Vitest (unit)
- Playwright (e2e)

### Script

```bash
npm run test:unit
npm run test:e2e
npm run test:run
```

`test:run` akan menjalankan unit lalu e2e.

### Playwright Config Ringkas

- testDir: `tests/e2e`
- baseURL default: `http://localhost:3000`
- retries di CI: `2`
- trace: `retain-on-failure`

## CI

### API CI (`pos_api/.github/workflows/ci.yml`)

- Menjalankan PostgreSQL service.
- `prisma generate`, `migrate deploy`, `db seed`.
- Menjalankan test dengan `DB_E2E=true`.

### Web CI (`pos_web/.github/workflows/ci.yml`)

- Install dependency.
- Install browser Playwright.
- Jalankan unit test lalu e2e.
- Upload `test-results/**` saat gagal.

## Rekomendasi Praktik

- Selalu jalankan minimal `test:run` sebelum merge PR penting.
- Untuk perubahan schema/API contract, jalankan API test + web e2e.
- Simpan test baru dekat domain perubahan agar mudah maintain.

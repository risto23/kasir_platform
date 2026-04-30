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
npm run test:e2e
npm run test:e2e:procurement
npm run test:run:full
```

### E2E DB-backed

Runner E2E sekarang mengaktifkan `DB_E2E=true` otomatis.

Sebelum E2E:

```bash
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

Menjalankan seluruh E2E backend:

```bash
npm run test:e2e
```

Menjalankan E2E procurement / SRM saja:

```bash
npm run test:e2e:procurement
```

Menjalankan unit/integration suite lalu seluruh E2E backend:

```bash
npm run test:run:full
```

### Suite E2E Backend Saat Ini

Suite E2E di `pos_api/tests/e2e`:

- `orders.e2e.test.ts`
- `promos.e2e.test.ts`
- `suppliers.e2e.test.ts`
- `purchase-orders.e2e.test.ts`
- `goods-receipts.e2e.test.ts`
- `purchase-returns.e2e.test.ts`
- `supplier-invoices.e2e.test.ts`
- `purchase-price-history.e2e.test.ts`

### Struktur Procurement / SRM E2E

Flow procurement sudah dipecah per modul supaya maintainable:

- `suppliers.e2e.test.ts`
- `purchase-orders.e2e.test.ts`
- `goods-receipts.e2e.test.ts`
- `purchase-returns.e2e.test.ts`
- `supplier-invoices.e2e.test.ts`
- `purchase-price-history.e2e.test.ts`

Helper bersama:

- `pos_api/tests/e2e/procurement-test-helpers.ts`

Runner khusus procurement:

- `pos_api/tests/run-procurement-e2e.cjs`

Runner seluruh E2E backend:

- `pos_api/tests/run-e2e.cjs`

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
- Menjalankan suite test backend dan E2E DB-backed.

### Web CI (`pos_web/.github/workflows/ci.yml`)

- Install dependency.
- Install browser Playwright.
- Jalankan unit test lalu e2e.
- Upload `test-results/**` saat gagal.

## Rekomendasi Praktik

- Selalu jalankan minimal `test:run` sebelum merge PR penting.
- Untuk perubahan schema/API contract, jalankan `test:e2e` backend + web e2e.
- Untuk perubahan supplier/procurement, minimal jalankan `test:e2e:procurement`.
- Simpan test baru dekat domain perubahan agar mudah maintain.

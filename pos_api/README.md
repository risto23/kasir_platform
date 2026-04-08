# POS Platform API — Testing Guide

This project uses Jest (+ ts-jest) and Supertest for automated testing. CI runs on GitHub Actions with a Postgres service and Prisma migrations/seed.

## Scripts
- `npm run test` — run Jest in interactive mode
- `npm run test:run` — run all tests once (CI-friendly)
- `npm run test:watch` — watch mode

## Unit vs E2E
- Unit/Mock tests: always run locally without a database.
- E2E (DB-backed): guarded by env flag `DB_E2E=true`.
  - CI sets up Postgres + Prisma and enables E2E.

## Local Setup for E2E
1) Start Postgres and set `DATABASE_URL` in `.env` (already present).
2) Apply schema and seed:
   - `npx prisma migrate deploy`
   - `npx prisma db seed`
3) Run tests with E2E enabled:
   - `DB_E2E=true npm run test:run`

### Seed Accounts (default)
- Super Admin (Retail): `superadmin-retail@pos.local` / `password123`
- Super Admin (Restaurant): `superadmin-resto@pos.local` / `password123`
- Business Owners:
  - Retail: `owner@demo.local` / `password123`
  - Restaurant: `owner-resto@demo.local` / `password123`

## Coverage
Coverage reports (text + lcov) can be generated and optionally enforced.

- Generate coverage locally:
  - `COVERAGE_ENFORCE=true npm run test:run`
  - Optional: set minimums, e.g. `COVERAGE_MIN=70` (default 70)
- In CI, you can enable enforcement by setting env:
  - `COVERAGE_ENFORCE=true`
  - `COVERAGE_MIN=70` (or 80/90 as targets increase)

The config only enforces thresholds when `COVERAGE_ENFORCE=true`, so local iteration stays fast.

## CI Summary
- GitHub Actions spins up Postgres 16, runs `prisma generate`, `migrate deploy`, and `db seed`, then executes tests.
- See `.github/workflows/ci.yml` for details.

## Troubleshooting
- Windows PowerShell execution policy may print warnings; they are harmless for tests.
- If E2E fails locally, ensure your DB is reachable and the schema/seed ran successfully.

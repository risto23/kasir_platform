# Coding Convention

Konvensi ini mengikuti pola kode yang sudah ada di `pos_api` dan `pos_web`.

## Umum

- Gunakan TypeScript strict mode.
- Gunakan penamaan file kebab-case.
- Gunakan import path yang rapi dan hindari circular dependency.
- Gunakan semicolon konsisten.
- Error handling harus eksplisit (hindari silent failure).

## Backend (`pos_api`)

### Struktur Module

Satu domain disarankan punya file:

- `*.controller.ts`
- `*.service.ts`
- `*.routes.ts`
- `*.validation.ts`
- `*.types.ts` (jika diperlukan)

### Naming

- Function controller: `<action>Controller`
- Service: `<action>Service`
- Validation schema: `<action>Schema`
- Middleware: `<purpose>Middleware`

### API Contract

- Selalu pakai helper:
  - `successResponse(message, data)`
  - `errorResponse(message, errors)`
- Status code harus sesuai konteks (`400/401/403/404/500`).

### Security

- Endpoint protected wajib lewat `authMiddleware`.
- Endpoint business scope wajib mempertimbangkan `x-business-id`.
- Gunakan permission middleware untuk operasi sensitif.

## Frontend (`pos_web`)

### Routing dan Layering

- Route page di `src/app/**/page.tsx`.
- Komponen reusable di `src/components`.
- Integrasi API di `src/lib`.
- Type contract di `src/types`.

### Data Fetching

- Gunakan `api` client (`src/lib/api.ts`) untuk endpoint internal app.
- Pastikan token dan `x-business-id` terpasang otomatis dari storage sesuai helper yang tersedia.

### Form

- Gunakan React Hook Form + Zod untuk validasi.
- Error message harus user-friendly dan konsisten bahasa.

## Formatting dan Lint

- Frontend mengikuti `eslint-config-next` (`core-web-vitals` + `typescript`).
- Hindari disable lint global; prefer per-case dan beralasan.

## Testing

- Unit test fokus pada service/helper/logic.
- E2E test fokus pada user flow utama dan regression kritikal.

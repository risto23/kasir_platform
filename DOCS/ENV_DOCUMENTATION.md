# Environment Variables Documentation

## API (`pos_api/.env`)

| Variable | Wajib | Default | Keterangan |
|---|---|---|---|
| `PORT` | Tidak | `4000` | Port server API. |
| `NODE_ENV` | Tidak | `development` | Mode aplikasi (`development`, `test`, `production`). |
| `DATABASE_URL` | Ya | - | Connection string PostgreSQL untuk Prisma. |
| `JWT_SECRET` | Ya | `change-me` (fallback) | Secret JWT auth. Wajib di production. |
| `JWT_EXPIRES_IN` | Tidak | `1d` | Masa berlaku token. |
| `APP_ORIGIN` | Ya | `http://localhost:3000` | Daftar origin yang diizinkan CORS (boleh multi-origin dipisah koma). |
| `BCRYPT_SALT_ROUNDS` | Tidak | `10` | Salt rounds untuk hash password. |
| `GUEST_QR_SECRET` | Tidak | fallback ke `POS_GUEST_QR_SECRET` lalu `JWT_SECRET` | Secret signing token QR guest. |
| `POS_GUEST_QR_SECRET` | Tidak | fallback ke `JWT_SECRET` | Alias secret QR guest (legacy). |
| `PUBLIC_APP_URL` | Tidak | fallback lain | Base URL frontend untuk generate URL guest menu dari API. |
| `FRONTEND_APP_URL` | Tidak | fallback lain | Alias base URL frontend. |
| `NEXT_PUBLIC_APP_URL` | Tidak | `http://localhost:3000` (fallback akhir) | Alias base URL frontend untuk guest URL builder. |
| `DB_E2E` | Tidak | `false` | Jika `true`, aktifkan test E2E yang butuh DB (dipakai pada test). |

Catatan:

- `DEFAULT_PLATFORM_SUPER_ADMIN_EMAIL` dan `DEFAULT_BUSINESS_TYPE` ada di `.env.example`, namun tidak dipakai langsung di runtime source saat ini.

## Web (`pos_web/.env.local`)

| Variable | Wajib | Default | Keterangan |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Ya | - | Base URL Axios client utama frontend (contoh: `http://localhost:4000/api`). |
| `NEXT_PUBLIC_API_URL` | Tidak | `http://localhost:4000/api` | Dipakai khusus helper guest client (`src/lib/guest.ts`). |
| `NEXT_PUBLIC_APP_NAME` | Tidak | - | Nama app publik (branding), tersedia di `.env.local.example`. |

## Contoh Konfigurasi Local

`pos_api/.env`:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pos_platform?schema=public
JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=1d
APP_ORIGIN=http://localhost:3000
BCRYPT_SALT_ROUNDS=10
GUEST_QR_SECRET=replace-with-guest-secret
PUBLIC_APP_URL=http://localhost:3000
```

`pos_web/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_APP_NAME=POS Platform
```

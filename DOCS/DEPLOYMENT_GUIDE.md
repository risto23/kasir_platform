# Deployment Guide

Dokumen ini menjelaskan deployment standar tanpa container, mengikuti struktur project saat ini.

## 1. Persiapan Server

- OS Linux (Ubuntu direkomendasikan)
- Node.js 20+ untuk API, Node.js 22 direkomendasikan untuk Web
- PostgreSQL 16+
- Reverse proxy (Nginx)
- Process manager (PM2/systemd)

## 2. Deploy API (`pos_api`)

### 2.1 Install dan Build

```bash
cd pos_api
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
```

### 2.2 Environment Production

Minimal:

- `NODE_ENV=production`
- `PORT=4000` (atau port internal lain)
- `DATABASE_URL=<prod_db_url>`
- `JWT_SECRET=<strong_secret>`
- `APP_ORIGIN=<https://domain-frontend>`
- `GUEST_QR_SECRET=<strong_secret>` (direkomendasikan)

### 2.3 Start Service

```bash
npm run start
```

Atau via PM2:

```bash
pm2 start dist/server.js --name pos-api
```

## 3. Deploy Web (`pos_web`)

### 3.1 Install dan Build

```bash
cd pos_web
npm ci
npm run build
```

### 3.2 Environment Production

Minimal:

- `NEXT_PUBLIC_API_BASE_URL=https://api.domain.com/api`
- `NEXT_PUBLIC_API_URL=https://api.domain.com/api` (disarankan untuk flow guest)

### 3.3 Start Service

```bash
npm run start
```

Atau via PM2:

```bash
pm2 start npm --name pos-web -- start
```

## 4. Reverse Proxy (Nginx) Konsep

- `https://app.domain.com` -> `pos_web` (port 3000 internal)
- `https://api.domain.com` -> `pos_api` (port 4000 internal)
- Pastikan CORS API (`APP_ORIGIN`) sesuai domain frontend.

## 5. Checklist Rilis

- Pull code terbaru.
- Install dependency (`npm ci`) di kedua app.
- Jalankan migrasi DB API.
- Build API dan Web.
- Restart process manager.
- Smoke test:
  - login
  - list product
  - create order
  - pembayaran
  - guest menu (jika aktif)

## 6. Rollback Singkat

- Simpan artefak build/commit sebelumnya.
- Jika rilis bermasalah:
  - rollback code ke commit stabil
  - jalankan ulang build + restart service
  - rollback schema hanya jika benar-benar diperlukan dan sudah dipersiapkan

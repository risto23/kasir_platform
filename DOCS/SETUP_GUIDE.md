# Setup Guide

## 1. Prasyarat

- Node.js 20+ (API CI pakai Node 20, Web CI pakai Node 22)
- npm 10+
- PostgreSQL 16+

## 2. Clone dan Install Dependency

Dari root project:

```bash
cd pos_api
npm install

cd ../pos_web
npm install
```

## 3. Setup Environment

### API (`pos_api`)

```bash
cp .env.example .env
```

Isi minimal:

- `DATABASE_URL`
- `JWT_SECRET`
- `APP_ORIGIN` (default `http://localhost:3000`)

### Web (`pos_web`)

```bash
cp .env.local.example .env.local
```

Set minimal:

- `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api`

Opsional (fitur guest):

- `NEXT_PUBLIC_API_URL=http://localhost:4000/api`

## 4. Setup Database API

```bash
cd pos_api
npx prisma generate
npx prisma migrate deploy
npx prisma db seed
```

## 5. Jalankan Aplikasi (Development)

Terminal 1 (API):

```bash
cd pos_api
npm run dev
```

Terminal 2 (Web):

```bash
cd pos_web
npm run dev
```

Endpoint local default:

- API: `http://localhost:4000`
- Web: `http://localhost:3000`

## 6. Akun Seed Default

- `superadmin-retail@pos.local` / `password123`
- `superadmin-resto@pos.local` / `password123`
- `owner@demo.local` / `password123`
- `owner-resto@demo.local` / `password123`
- `admin-all@demo.local` / `password123`
- `admin-limited@demo.local` / `password123`
- `cashier@demo.local` / `password123`
- `kitchen@demo.local` / `password123`
- `inventory@demo.local` / `password123`

# Deployment Readiness Report - POS Platform

## 1. Security Audit
- [x] **JWT & Secrets**: Kode sudah mengecek `JWT_SECRET` dan `GUEST_QR_SECRET` di production. Pastikan di VPS nilainya panjang (min 32 karakter) dan unik.
- [x] **CORS**: Sudah menggunakan whitelist `APP_ORIGIN`. Pastikan di VPS nilainya adalah domain/IP publik kamu.
- [x] **Helmet**: API sudah menggunakan `helmet()` untuk proteksi header HTTP.
- [x] **Validation**: Input sudah divalidasi menggunakan Zod.

## 2. Infrastructure Requirements
- **Database**: Membutuhkan PostgreSQL 16 (sesuai target CI).
- **Node.js**: Minimal versi 20.
- **Reverse Proxy**: Sangat disarankan menggunakan **Nginx** dengan SSL (Certbot).

## 3. Masalah Kritikal (Wajib Diperbaiki Sebelum Deploy)
Masalah utama ada pada script `sync-ip.js`. Script ini dirancang untuk development lokal (sinkronisasi IP WiFi), tetapi script ini dijalankan otomatis setiap kali `npm start` dipanggil (via `prestart`).

### Solusi:
Hapus atau komentari bagian `prestart` di `package.json` baik di `pos_api` maupun `pos_web`.

## 4. Langkah-Langkah Deploy (Rekomendasi)

### A. Persiapan Kode (Di Lokal sebelum Push)
1. Buka `pos_api/package.json` dan hapus baris `"prestart": "node ../sync-ip.js"`.
2. Buka `pos_web/package.json` dan hapus baris `"prestart": "node ../sync-ip.js"`.
3. Di `pos_web/next.config.ts`, hapus `dangerouslyAllowLocalIP: true` dan sesuaikan `allowedDevOrigins` jika perlu (atau biarkan kosong).

### B. Konfigurasi Environment (Di VPS)
Buat file `.env` manual di folder masing-masing di VPS:

**API (`pos_api/.env`):**
```env
PORT=4000
NODE_ENV=production
DATABASE_URL="postgresql://user:password@localhost:5432/pos_db"
JWT_SECRET="hasil-generate-random-string-32-karakter"
GUEST_QR_SECRET="hasil-generate-random-string-32-karakter"
APP_ORIGIN="https://app.kamu.com"
```

**Web (`pos_web/.env.production`):**
```env
NEXT_PUBLIC_API_URL="https://api.kamu.com"
NEXT_PUBLIC_API_BASE_URL="https://api.kamu.com/api"
```

### C. Menjalankan Aplikasi
Gunakan **PM2** agar aplikasi otomatis restart jika server reboot:
```bash
# Di pos_api
npm run build
pm2 start dist/server.js --name pos-api

# Di pos_web
npm run build
pm2 start npm --name pos-web -- start
```

## 5. Kesimpulan
**Status: SIAP DEPLOY (dengan catatan perbaikan `sync-ip.js`)**
Setelah menghapus script auto-sync tersebut, aplikasi sudah sangat layak untuk di-upload ke VPS.

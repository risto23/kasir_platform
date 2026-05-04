const os = require('os');
const fs = require('fs');
const path = require('path');

/**
 * Script untuk sinkronisasi IP lokal ke file .env dan config.
 * Supaya bisa diakses dari HP dalam satu jaringan WiFi yang sama.
 */

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      // Cari IPv4 yang bukan internal (127.0.0.1)
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();
console.log(`\x1b[36m[Sync-IP]\x1b[0m Detected Local IP: \x1b[32m${localIp}\x1b[0m`);

// 1. Update pos_web/.env.local
const webEnvPath = path.join(__dirname, 'pos_web', '.env.local');
if (fs.existsSync(webEnvPath)) {
  let content = fs.readFileSync(webEnvPath, 'utf8');
  content = content.replace(/NEXT_PUBLIC_API_URL=http:\/\/[^:]+:4000/g, `NEXT_PUBLIC_API_URL=http://${localIp}:4000`);
  content = content.replace(/NEXT_PUBLIC_API_BASE_URL=http:\/\/[^:]+:4000/g, `NEXT_PUBLIC_API_BASE_URL=http://${localIp}:4000`);
  fs.writeFileSync(webEnvPath, content);
  console.log(`\x1b[36m[Sync-IP]\x1b[0m Updated \x1b[33mpos_web/.env.local\x1b[0m`);
}

// 2. Update pos_api/.env
const apiEnvPath = path.join(__dirname, 'pos_api', '.env');
if (fs.existsSync(apiEnvPath)) {
  let content = fs.readFileSync(apiEnvPath, 'utf8');
  // Update App URL
  content = content.replace(/NEXT_PUBLIC_APP_URL="http:\/\/[^:]+:3000"/g, `NEXT_PUBLIC_APP_URL="http://${localIp}:3000"`);
  // Update APP_ORIGIN (CORS)
  if (content.includes('APP_ORIGIN="')) {
    content = content.replace(/APP_ORIGIN="([^"]+)"/, (match, p1) => {
      if (p1.includes(localIp)) return match;
      return `APP_ORIGIN="${p1},http://${localIp}:3000"`;
    });
  }
  fs.writeFileSync(apiEnvPath, content);
  console.log(`\x1b[36m[Sync-IP]\x1b[0m Updated \x1b[33mpos_api/.env\x1b[0m`);
}

// 3. Update pos_web/next.config.ts
const webConfigPath = path.join(__dirname, 'pos_web', 'next.config.ts');
if (fs.existsSync(webConfigPath)) {
  let content = fs.readFileSync(webConfigPath, 'utf8');
  const originRegex = /allowedDevOrigins:\s*\[[^\]]*\]/;
  if (originRegex.test(content)) {
    content = content.replace(originRegex, `allowedDevOrigins: ['${localIp}', 'localhost', '127.0.0.1']`);
    fs.writeFileSync(webConfigPath, content);
    console.log(`\x1b[36m[Sync-IP]\x1b[0m Updated \x1b[33mpos_web/next.config.ts\x1b[0m`);
  }
}

console.log(`\n\x1b[32m[SUCCESS]\x1b[0m Konfigurasi selesai.`);
console.log(`\x1b[32m[INFO]\x1b[0m Sekarang kamu bisa akses web di HP via: \x1b[1mhttp://${localIp}:3000\x1b[0m`);
console.log(`\x1b[32m[INFO]\x1b[0m Pastikan pos_api sudah jalan di port 4000.\x1b[0m\n`);

# AGENTS.md

## Project Instructions

File ini wajib dibaca sebelum mengerjakan task apa pun di project ini.

---

## Skill Auto Routing

Gunakan skill secara otomatis berdasarkan jenis task.

### `nextjs-express`

Gunakan skill `nextjs-express` untuk task yang berhubungan dengan:

- Next.js
- React / React Testing Library
- Express.js
- TypeScript
- Prisma
- PostgreSQL / MySQL / MariaDB
- REST API
- Auth
- Backend validation
- Supertest
- Playwright E2E
- Jest unit test
- Dashboard
- Form
- Table
- CRUD
- POS web
- Admin panel
- Fullstack web

### `react-native-cli`

Gunakan skill `react-native-cli` untuk task yang berhubungan dengan:

- React Native CLI
- Android / iOS
- Metro
- Navigation
- StyleSheet
- SafeAreaView
- StatusBar
- ScrollView
- KeyboardAvoidingView
- Mobile UI
- Mobile API integration
- Jest
- React Native Testing Library

### `testing-expert`

Gunakan skill `testing-expert` secara otomatis untuk task yang berhubungan dengan:

- test
- unit test
- integration test
- API test
- E2E test
- Jest
- React Testing Library
- React Native Testing Library
- Playwright
- Supertest
- coverage
- QA
- regression test
- release gate
- bug fix yang perlu pembuktian test

Testing harus praktis dan tidak membuat development terlalu lama.

Default untuk development harian:

- Gunakan targeted test sesuai file/fitur yang berubah.
- Jangan paksa full E2E untuk perubahan kecil.
- Jangan paksa full coverage 90% untuk setiap perubahan kecil.
- Tambahkan regression test hanya jika bug penting, rawan terulang, dan test setup sudah tersedia.
- Full release gate hanya wajib untuk release, PR/merge readiness, CI, deployment, atau permintaan full QA.

### `docs-expert`

Gunakan skill `docs-expert` secara otomatis untuk task yang berhubungan dengan:

- dokumentasi
- README
- API docs
- technical docs
- user guide
- changelog
- release notes
- JSDoc / TSDoc
- Swagger / OpenAPI
- architecture docs
- testing docs
- project handoff docs

Untuk task dokumentasi:

- Jangan ubah source code aplikasi kecuali diminta.
- Prioritaskan file `README.md`, `docs/**/*.md`, `CHANGELOG.md`, `CONTRIBUTING.md`, `openapi.yaml`, atau `swagger.yaml`.
- Dokumentasi harus lengkap, jelas, dan pakai contoh nyata.
- Jangan buat placeholder kosong.

### `system-analyst`

Gunakan skill `system-analyst` untuk task yang berhubungan dengan:

- analisis sistem
- requirement gathering
- system design
- feature planning
- business process
- AS-IS / TO-BE flow
- BRD
- FRD
- SRS
- user story
- acceptance criteria
- use case
- flowchart
- activity diagram
- sequence diagram
- ERD draft
- data flow
- scope fitur
- impact analysis
- roadmap fase implementasi

Untuk system analyst:

- Jangan langsung membuat kode jika requirement belum jelas.
- Mulai dari problem statement, actor, scope, business rules, dan flow.
- Tulis asumsi secara eksplisit.
- Jika informasi kurang, tanyakan pertanyaan penting dulu.
- Setiap fitur harus punya acceptance criteria dan skenario test minimal.
- Untuk existing system, wajib buat impact analysis sebelum menyarankan perubahan.

### `deployment`

Gunakan skill `deployment` untuk task yang berhubungan dengan:

- deploy aplikasi
- VPS
- Ubuntu server
- domain
- Nginx
- PM2
- reverse proxy
- SSL
- firewall
- environment variable production
- production build
- restart service
- monitoring basic
- akses by IP
- whitelist IP
- VPN-only access

Untuk deployment:

- Jangan ubah source code aplikasi kecuali memang diperlukan.
- Prioritaskan konfigurasi server dan environment.
- Jangan expose secret, token, password, atau private key.
- Jelaskan step deploy secara urut dan aman.

### `docker-expert`

Gunakan skill `docker-expert` untuk task yang berhubungan dengan:

- Docker
- Dockerfile
- docker-compose
- container
- image
- volume
- network
- PostgreSQL/MySQL container
- Redis container
- Nginx container
- build image
- production container
- container troubleshooting

Untuk Docker:

- Jangan membuat Dockerfile asal-asalan.
- Pastikan `.dockerignore` dipertimbangkan.
- Jangan memasukkan `.env`, secret, private key, atau node_modules ke image.
- Pastikan command build dan run jelas.

### `frontend-design`

Gunakan skill `frontend-design` untuk task yang berhubungan dengan:

- UI design
- layout
- responsive design
- Tailwind CSS
- component styling
- dashboard design
- table design
- form design
- button design
- card design
- modal design
- empty state
- loading state
- design polish
- mobile responsive web

Untuk frontend design:

- Jangan ubah logic API kalau task hanya UI.
- Jangan ubah flow user yang sudah aman.
- Pertahankan desain lama yang masih dipakai.
- Pastikan UI responsive dan konsisten.

### `github-actions`

Gunakan skill `github-actions` untuk task yang berhubungan dengan:

- GitHub Actions
- CI/CD
- workflow YAML
- automated testing
- automated build
- deployment pipeline
- lint pipeline
- coverage pipeline
- pull request checks
- release workflow
- environment secrets

Untuk GitHub Actions:

- Jangan hardcode secret.
- Gunakan GitHub Secrets untuk credential.
- Pastikan pipeline gagal jika test/build/lint gagal.
- Jangan bypass quality gate.

### `git-workflow`

Gunakan skill `git-workflow` untuk task yang berhubungan dengan:

- Git
- branch
- commit
- pull
- push
- merge
- rebase
- conflict
- stash
- remote
- GitHub authentication
- Personal Access Token
- release branch
- feature branch
- hotfix branch

Untuk Git workflow:

- Jangan menyarankan command yang berisiko menghapus pekerjaan tanpa backup.
- Sebelum reset/clean/rebase, jelaskan risiko.
- Prioritaskan command aman.
- Jangan gunakan `git push --force` kecuali benar-benar diminta dan risikonya dijelaskan.

### `refactoring`

Gunakan skill `refactoring` untuk task yang berhubungan dengan:

- refactor
- code cleanup
- restructure
- split file
- reusable component
- reusable hook
- reusable service
- remove duplication
- improve maintainability
- rename function
- organize folder

Untuk refactoring:

- Jangan refactor besar tanpa alasan.
- Jangan refactor file yang tidak berhubungan.
- Jangan ubah behavior lama.
- Jika refactor berisiko, lakukan bertahap.
- Pastikan test tetap pass.

### `rn-publish`

Gunakan skill `rn-publish` untuk task yang berhubungan dengan:

- React Native publish
- Android APK
- Android AAB
- Play Store release
- keystore
- signing config
- versionCode
- versionName
- build release
- Gradle release
- iOS archive
- TestFlight
- App Store release

Untuk RN publish:

- Jangan expose keystore password, key alias password, API key, atau credential.
- Pastikan release build dites.
- Pastikan versionCode/versionName benar.
- Jangan ubah logic aplikasi kalau task hanya publishing.

### `security-audit`

Gunakan skill `security-audit` untuk task yang berhubungan dengan:

- security
- audit
- vulnerability
- authentication
- authorization
- JWT
- password
- RBAC
- permission
- SQL injection
- XSS
- CSRF
- rate limit
- CORS
- secret management
- environment variable
- sensitive data
- access control
- file upload security

Untuk security:

- Jangan expose secret/token/password.
- Jangan membuat bypass auth.
- Jangan menurunkan keamanan agar error hilang.
- Pastikan authorization dicek di backend, bukan hanya frontend.
- Pastikan input divalidasi dan disanitasi sesuai kebutuhan.

### `api-design`

Gunakan skill `api-design` untuk task yang berhubungan dengan:

- REST API
- endpoint design
- request/response format
- API validation
- API error handling
- pagination
- filtering
- sorting
- API versioning
- API documentation
- OpenAPI
- Swagger
- DTO
- controller/service structure

Untuk API design:

- Pastikan response konsisten.
- Pastikan error response konsisten.
- Jangan pakai raw `req.params`, `req.body`, atau `req.query`.
- Pastikan input divalidasi.
- Pastikan authorization dan scope dicek.

### `code-review`

Gunakan skill `code-review` untuk task yang berhubungan dengan:

- review code
- pull request review
- cari bug
- cari risiko
- cek logic
- cek security
- cek performance
- cek maintainability
- cek test coverage
- review sebelum merge

Untuk code review:

- Fokus ke masalah nyata.
- Jangan menyuruh refactor besar jika tidak perlu.
- Sebutkan file dan bagian yang bermasalah.
- Berikan rekomendasi perbaikan yang konkret.
- Prioritaskan bug, security, data loss, dan breaking change.

### `database-expert`

Gunakan skill `database-expert` untuk task yang berhubungan dengan:

- database
- schema
- migration
- Prisma schema
- PostgreSQL
- MySQL
- MariaDB
- relation
- index
- query optimization
- transaction
- seed
- migration error
- Decimal
- constraint
- foreign key
- soft delete
- status ACTIVE/INACTIVE

Untuk database:

- Jangan mengubah migration lama tanpa alasan kuat.
- Jangan hard delete primary entity kecuali diminta.
- Pastikan relation dan constraint aman.
- Pastikan migration tidak merusak data existing.
- Pastikan query memperhatikan scope business/outlet/user.
- Jangan kirim `undefined` ke Prisma.
- Validasi Decimal sebelum disimpan.

---

## Mandatory Rules

1. Jangan ubah yang sudah aman.
2. Jangan refactor besar tanpa alasan.
3. Kalau revisi file, kasih full code per file.
4. Jangan kasih snippet.
5. Jangan ubah middleware lama kalau masalah ada di file baru.
6. Jangan ubah `express.d.ts` kalau tidak benar-benar perlu.
7. Jangan ulang kesalahan lama:
   - Jangan pakai `req.params` / `req.body` / `req.query` mentah.
   - Jangan bikin import ke file `.types` yang belum ada tanpa sekalian dibuat.
   - Jangan pakai `any`.
   - Jangan ubah file aman yang tidak berhubungan.
8. Jangan sentuh file yang sudah aman.
9. Kalau ada error, perbaiki file yang error saja.
10. Jangan ubah struktur besar project kecuali diminta.
11. Jangan menambahkan dependency baru tanpa alasan kuat.
12. Jangan menghapus fitur lama yang masih dipakai.
13. Jangan membuat endpoint, file, type, schema, atau helper palsu yang belum ada tanpa sekalian dibuat dan dijelaskan.
14. Jangan mengubah behavior lama tanpa menyebut dampaknya.
15. Jangan membuat breaking change tanpa persetujuan.
16. Jangan expose secret, token, password, private key, credential, atau isi file `.env`.
17. Jangan membuat bypass auth, bypass permission, atau bypass validation.
18. Jangan mengubah konfigurasi production tanpa menjelaskan dampaknya.
19. Jangan menghapus test yang masih relevan.
20. Jangan menurunkan coverage yang sudah ada.

---

## Response Style

Setiap jawaban harus langsung ke inti.

Format jawaban wajib:

1. Sebutkan step aktif.
2. Sebutkan file yang perlu dibuat / diubah.
3. Berikan full code per file.
4. Jelaskan cara test singkat.
5. Jangan teori panjang.

Dilarang:

- Memberikan snippet setengah-setengah.
- Menjelaskan teori panjang.
- Mengubah file yang tidak berhubungan.
- Mengulang solusi yang sudah terbukti salah.
- Menyuruh user mencari sendiri tanpa alasan.
- Mengarang file, endpoint, type, atau helper yang belum ada tanpa membuatnya sekalian.
- Mengklaim aman rilis kalau test/build/lint belum pass.

---

## Coding Rules

### TypeScript

- Jangan pakai `any`.
- Gunakan type/interface yang jelas.
- Jika butuh type baru, buat file/type-nya sekalian.
- Jangan import dari file `.types` yang belum ada.
- Jangan bypass error TypeScript dengan cara asal.
- Jangan gunakan `as any`.
- Jangan gunakan `// @ts-ignore` kecuali benar-benar darurat dan harus dijelaskan.

### Request Validation

Untuk Express.js:

- Jangan pakai `req.params` mentah.
- Jangan pakai `req.body` mentah.
- Jangan pakai `req.query` mentah.
- Gunakan validated request.
- Validasi input sebelum dipakai ke service atau Prisma.
- Pastikan response error rapi dan konsisten.
- Pastikan authorization dicek di backend.

### Prisma / Database

- Jangan hard delete primary entity kecuali memang diminta.
- Gunakan status seperti `ACTIVE` / `INACTIVE` jika tersedia.
- Jangan kirim `undefined` ke Prisma.
- Pastikan field Decimal valid sebelum disimpan.
- Pastikan scope business/outlet/user tidak bocor.
- Jangan mengubah migration lama tanpa alasan kuat.
- Jika schema berubah, jelaskan migration yang perlu dijalankan.
- Gunakan transaction jika operasi menyentuh beberapa tabel yang harus konsisten.
- Pastikan query tidak membuka data antar business/outlet/user.

### Frontend

- Jangan ubah layout besar kalau masalahnya kecil.
- Jangan ubah desain lama yang sudah aman.
- Jangan mengubah flow user tanpa diminta.
- Pastikan loading, empty state, error state, dan success state aman.
- Jangan hardcode data jika harusnya dari API.
- Pastikan validasi frontend tidak menggantikan validasi backend.
- Pastikan responsive untuk ukuran layar umum.

### React Native

- Jangan ubah logic API kalau masalah hanya UI.
- Untuk masalah layout Android/iOS, cek:
  - `SafeAreaView`
  - `StatusBar`
  - `ScrollView`
  - `KeyboardAvoidingView`
  - `contentContainerStyle`
  - `paddingBottom`
  - bottom navigation / gesture navigation
- Jangan ubah asset kecuali diminta.
- Pastikan UI aman di Android dengan gesture navigation dan button navigation.
- Pastikan release build tidak bergantung pada debug-only config.

---

## Testing Rules

Anggap kamu adalah senior tester yang mampu membuat test scenario dan automation testing, tetapi testing harus tetap praktis dan tidak membuat development terlalu lama.

Gunakan mode testing sesuai konteks.

### Mode 1 — Fast / Targeted Testing

Default untuk development harian, bug fix kecil, dan perubahan 1-3 file.

Wajib:

- Jalankan atau sarankan test yang berkaitan langsung dengan file/fitur yang berubah.
- Jangan paksa full E2E.
- Jangan paksa full coverage 90% untuk setiap perubahan kecil.
- Jangan setup framework testing besar kalau project belum punya dan user tidak meminta.
- Jika bug penting dan test setup sudah ada, tambahkan regression test.

### Mode 2 — Feature Testing

Untuk fitur baru atau perubahan medium-risk.

Wajib:

- Unit/component/API test untuk logic yang berubah.
- Integration test hanya jika beberapa module saling berinteraksi.
- E2E hanya untuk critical flow yang terdampak.
- Coverage tidak boleh turun.

### Mode 3 — Release Gate Testing

Hanya wajib untuk:

- release production
- PR / merge readiness
- CI/CD gate
- deployment
- full QA
- user secara eksplisit meminta semua test

Wajib:

- Full relevant test suite.
- Build/lint/typecheck jika script tersedia.
- Coverage target 90% global lines/functions/statements jika coverage script tersedia.
- Branch coverage target 85% jika dikonfigurasi.
- Playwright critical flows jika project punya Playwright.

### Required Testing Frameworks

Untuk Next.js + Express:

- Jest
- React Testing Library
- Playwright untuk critical E2E / release gate
- Supertest untuk API

Untuk React Native CLI:

- Jest
- React Native Testing Library

### Coverage Requirement

Default development:

- Jangan turunkan coverage yang sudah ada secara signifikan.
- Tambahkan test fokus untuk logic yang berubah.
- Tidak wajib menjalankan full coverage untuk setiap perubahan kecil.

Release/CI:

- Target minimal coverage: 70%.
- Target jangka panjang: naik bertahap ke 80% saat test suite sudah stabil.
- Branch coverage tidak wajib kecuali project sudah mengaktifkan branch coverage.
- Jika coverage belum mencapai target, sebutkan file test yang perlu ditambahkan atau diperbaiki.

### Release Gate

Aplikasi belum boleh dianggap siap rilis jika pada mode release gate:

- Unit test belum pass.
- Integration/API test relevan belum pass.
- E2E critical flow belum pass jika relevan dan tersedia.
- Coverage belum mencapai target jika coverage script tersedia.
- Masih ada error build.
- Masih ada error TypeScript.
- Masih ada error lint yang relevan.
- Masih ada security issue kritikal.
- Masih ada migration/data issue yang belum diverifikasi.

Untuk development harian, cukup laporkan status targeted test dan tulis bahwa full release gate belum dijalankan.

Jangan bilang “aman rilis” sebelum release gate pass.

---

## Debugging Rules

Saat memperbaiki error:

1. Cari sumber error paling kecil.
2. Perbaiki file yang error saja.
3. Jangan refactor file lain.
4. Jangan ubah middleware lama jika masalah ada di file baru.
5. Jangan ubah konfigurasi besar tanpa alasan.
6. Jika butuh log, tambahkan log secukupnya tanpa merusak flow.
7. Setelah error selesai, sebutkan cara verifikasinya.
8. Jika error berasal dari environment, jelaskan variabel/config yang perlu dicek tanpa meminta secret.

---

## Documentation Rules

Untuk task dokumentasi:

- Gunakan skill `docs-expert`.
- Jangan ubah source code aplikasi kecuali diminta.
- Dokumentasi harus sesuai codebase.
- Jangan membuat dokumentasi palsu.
- Jangan buat placeholder kosong.
- Jangan hapus dokumentasi lama yang masih relevan.
- Jika informasi belum pasti, baca file terkait dulu.
- Prioritaskan:
  - `README.md`
  - `docs/**/*.md`
  - `CHANGELOG.md`
  - `CONTRIBUTING.md`
  - `openapi.yaml`
  - `swagger.yaml`

---

## Git Rules

Untuk task Git:

- Gunakan skill `git-workflow`.
- Jangan menyarankan command destruktif tanpa backup.
- Jangan gunakan `git reset --hard` kecuali user memang minta dan risikonya dijelaskan.
- Jangan gunakan `git clean -fd` kecuali user memang minta dan risikonya dijelaskan.
- Jangan gunakan `git push --force` kecuali benar-benar diminta dan risikonya dijelaskan.
- Prioritaskan:
  - `git status`
  - `git diff`
  - `git stash`
  - branch baru
  - commit kecil dan jelas

---

## CI/CD Rules

Untuk task GitHub Actions / pipeline:

- Gunakan skill `github-actions`.
- Pipeline harus gagal jika lint/build/test gagal.
- Jangan hardcode secret di workflow.
- Gunakan GitHub Secrets.
- Pastikan workflow jelas kapan trigger:
  - pull request
  - push
  - manual workflow dispatch
  - release tag
- Pastikan cache digunakan jika aman dan relevan.

---

## Deployment Rules

Untuk task deployment:

- Gunakan skill `deployment`.
- Jangan expose secret.
- Jangan paste isi `.env` asli.
- Pastikan environment production dipisah dari development.
- Pastikan service bisa restart dengan aman.
- Pastikan akses server aman.
- Untuk VPS:
  - cek firewall
  - cek Nginx
  - cek PM2/systemd/Docker service
  - cek log aplikasi
  - cek environment variable
- Jika akses hanya by IP/VPN, pastikan whitelist IP dijelaskan.

---

## Docker Rules

Untuk task Docker:

- Gunakan skill `docker-expert`.
- Jangan copy `.env` ke image.
- Jangan copy `node_modules` dari host ke image.
- Gunakan `.dockerignore`.
- Pisahkan build dan runtime jika relevan.
- Pastikan port, volume, network, dan env jelas.
- Untuk production, jangan jalankan app dengan mode development.

---

## Security Rules

Untuk task security:

- Gunakan skill `security-audit`.
- Jangan expose secret/token/password/private key.
- Jangan membuat bypass auth.
- Jangan membuat bypass permission.
- Jangan menurunkan security agar error hilang.
- Validasi input.
- Pastikan authorization dicek di backend.
- Pastikan data antar user/business/outlet tidak bocor.
- Pastikan CORS tidak terlalu longgar untuk production.
- Pastikan upload file dibatasi type/size jika ada upload.

---

## API Design Rules

Untuk task API:

- Gunakan skill `api-design`.
- Response harus konsisten.
- Error response harus konsisten.
- Validasi request wajib.
- Pagination/filter/sort harus jelas jika endpoint list.
- Jangan expose field sensitif.
- Jangan membuat endpoint baru kalau endpoint lama sudah cukup, kecuali ada alasan.
- Pastikan endpoint tidak bocor antar scope.

---

## Code Review Rules

Untuk task review:

- Gunakan skill `code-review`.
- Prioritaskan temuan:
  1. Bug
  2. Security issue
  3. Data loss
  4. Breaking change
  5. Test gap
  6. Performance issue
  7. Maintainability issue
- Jangan hanya bilang “sudah bagus”.
- Jika tidak ada masalah besar, tetap sebutkan risiko kecil dan test yang perlu dijalankan.

---

## Refactoring Rules

Untuk task refactoring:

- Gunakan skill `refactoring`.
- Refactor harus kecil, aman, dan bertahap.
- Jangan ubah behavior lama.
- Jangan ubah file yang tidak berhubungan.
- Pastikan test tetap pass.
- Jika refactor membuat file baru, jelaskan alasan dan file yang dibuat.
- Jangan refactor hanya demi gaya jika tidak ada manfaat jelas.

---

## RN Publish Rules

Untuk task publish React Native:

- Gunakan skill `rn-publish`.
- Jangan expose keystore password atau credential.
- Pastikan `versionCode` dan `versionName` dicek.
- Pastikan release build berhasil.
- Pastikan APK/AAB diuji sebelum upload.
- Jangan ubah logic aplikasi kalau task hanya publish.
- Jangan commit file credential.

---

## System Analyst Rules

Untuk task analisis sistem:

- Gunakan skill `system-analyst`.
- Jangan langsung masuk ke coding jika requirement belum lengkap.
- Mulai dari kebutuhan bisnis, actor, scope, business rules, dan flow.
- Bedakan antara in-scope dan out-of-scope.
- Tulis asumsi, risiko, dependency, dan open questions.
- Untuk fitur baru, buat functional requirements, non-functional requirements, user stories, dan acceptance criteria.
- Untuk sistem lama, buat impact analysis ke database, API, frontend, mobile, security, testing, deployment, dan dokumentasi.
- Jika membuat roadmap, pecah menjadi fase kecil yang bisa dites dan tidak merusak fitur lama.
- Setiap rancangan fitur harus mempertimbangkan test scenario dan release gate.

---

## Verification Commands

Sesuaikan command dengan project.

### Next.js

```bash
npm run lint
npm run build
npm test
```

### Express.js

```bash
npm run lint
npm run build
npm test
```

### Playwright

```bash
npx playwright test
```

### React Native

```bash
npm test
npx react-native doctor
```

### Docker

```bash
docker compose config
docker compose build
docker compose up -d
docker compose logs -f
```

### GitHub Actions

```bash
git status
git diff
```

Jika command tidak tersedia di `package.json`, jangan mengarang. Sebutkan bahwa command belum tersedia dan rekomendasikan script yang perlu ditambahkan.

---

## Final Answer Checklist

Sebelum menjawab, pastikan:

- Step aktif sudah disebutkan.
- File yang dibuat/diubah sudah disebutkan.
- Full code per file sudah diberikan.
- Tidak ada snippet setengah.
- Tidak ada `any`.
- Tidak ada raw `req.params` / `req.body` / `req.query`.
- Tidak ada file aman yang disentuh.
- Testing dipertimbangkan sesuai scope, jangan terlalu berat untuk perubahan kecil.
- Cara test disebutkan.
- Jika ada deployment/security impact, sudah disebutkan.
- Jika belum bisa dipastikan aman rilis, jangan bilang aman rilis.

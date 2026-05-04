# Subscription & Billing Phase 0

## Status

- Phase: `0 - Product Rules Lock`
- Document status: `RECOMMENDED BASELINE`
- Scope: subscription, billing, plan entitlement, usage counting, upgrade/downgrade, invoice lifecycle
- Effective use: jadikan dokumen ini sebagai acuan default untuk Fase 1 sampai Fase 7 sampai ada keputusan bisnis baru yang menggantikannya

## Tujuan

Mengunci aturan bisnis subscription/billing sebelum implementasi schema, service, endpoint, dan UI dimulai, supaya:

- migration tidak bolak-balik
- usage counting punya definisi tunggal
- junior developer punya scope yang jelas per fase
- enforcement tidak merusak flow POS existing

## Fakta Codebase Saat Ini

Aturan di dokumen ini disusun mengikuti kondisi repo saat ini:

- `BusinessType` yang tersedia di backend hanya `RESTAURANT` dan `RETAIL`
- entity usage utama sudah ada: `Business`, `Outlet`, `BusinessUser`, `Product`, `Order`, `Payment`
- status aktif/nonaktif sudah konsisten di banyak entity:
  - `BusinessStatus`
  - `OutletStatus`
  - `BusinessUserStatus`
  - `ProductStatus`
- order dan payment dipisah, sehingga satu order bisa punya lebih dari satu payment record
- feature flag bisnis yang sudah terlihat di seed:
  - `BUSINESS_MANAGEMENT`
  - `OUTLET_MANAGEMENT`
  - `BASIC_DASHBOARD`
  - `CATEGORY_MANAGEMENT`
  - `PRODUCT_MANAGEMENT`
  - `GUEST_QR`
  - `TABLE_MANAGEMENT`
  - `KITCHEN_DISPLAY`

Implikasi penting:

- limit transaksi bulanan harus dihitung dari transaksi bisnis, bukan jumlah row payment
- compatibility plan harus dicek terhadap `BusinessType`
- gating fitur sebaiknya reuse pola `BusinessFeatureFlag` yang sudah ada

## Actor

| Actor | Tanggung jawab |
|---|---|
| Business Owner | Melihat paket, invoice, usage, meminta upgrade/downgrade, cancel/reactivate |
| Platform Super Admin | Override administratif, bantuan aktivasi, koreksi invoice/manual payment |
| Scheduler/Job System | Generate recurring invoice, reminder due date, update status overdue/suspend |
| Payment Gateway | Out of scope Phase 0, direncanakan mulai Fase 7 |

## In Scope

- definisi paket
- definisi limit per paket
- definisi status subscription
- aturan invoice recurring awal
- aturan upgrade/downgrade
- definisi usage counting
- suspend dan grace period rule
- acceptance criteria dan test scenario minimal

## Out of Scope

- implementasi payment gateway
- auto debit / tokenized recurring card charge
- diskon promosi subscription
- annual billing
- multi-currency
- tax engine kompleks
- partnership/reseller billing

## Paket Final yang Direkomendasikan

### Katalog Paket

| Code | Nama | Business type | Harga bulanan | Posisi paket |
|---|---|---|---:|---|
| `STARTER` | Starter | `RETAIL`, `RESTAURANT` | `149000` | entry level |
| `BASIC` | Basic | `RETAIL`, `RESTAURANT` | `299000` | small business |
| `RESTAURANT` | Restaurant | `RESTAURANT` | `499000` | restoran yang butuh meja + kitchen |
| `RETAIL_PRO` | Retail Pro | `RETAIL` | `499000` | retail dengan katalog besar |
| `BUSINESS` | Business | `RETAIL`, `RESTAURANT` | `1299000` | multi outlet menengah |
| `ENTERPRISE` | Enterprise | `RETAIL`, `RESTAURANT` | `CUSTOM` | high volume / negotiated |

Catatan:

- harga direkomendasikan disimpan sebagai nilai sebelum pajak
- `ENTERPRISE` tidak memakai angka tetap di seed awal, cukup tandai `customPricing = true` saat masuk fase schema
- paket `RESTAURANT` dan `RETAIL_PRO` wajib divalidasi terhadap `BusinessType`

### Limit Per Paket

| Plan | Max outlet | Max active user | Max active product | Max monthly transaction |
|---|---:|---:|---:|---:|
| Starter | 1 | 3 | 100 | 1000 |
| Basic | 2 | 8 | 500 | 5000 |
| Restaurant | 3 | 12 | 750 | 7000 |
| Retail Pro | 3 | 12 | 5000 | 12000 |
| Business | 10 | 30 | 20000 | 50000 |
| Enterprise | custom | custom | custom | custom |

Alasan baseline:

- `Starter` cukup aman untuk bisnis baru tanpa memaksa schema rumit
- `Restaurant` dan `Retail Pro` dibedakan lewat limit dan entitlement, bukan hanya nama
- `Business` jadi paket generik sebelum `Enterprise`

### Entitlement Fitur per Paket

| Capability | Starter | Basic | Restaurant | Retail Pro | Business | Enterprise |
|---|---|---|---|---|---|---|
| Basic dashboard | Ya | Ya | Ya | Ya | Ya | Ya |
| Outlet management | Ya | Ya | Ya | Ya | Ya | Ya |
| Product management | Ya | Ya | Ya | Ya | Ya | Ya |
| Category management | Ya | Ya | Ya | Ya | Ya | Ya |
| Guest QR | Tidak | Optional | Ya | Tidak | Optional | Custom |
| Table management | Tidak | Tidak | Ya | Tidak | Optional | Custom |
| Kitchen display | Tidak | Tidak | Ya | Tidak | Optional | Custom |
| Inventory heavy usage | Limited | Limited | Limited | Ya | Ya | Custom |
| Custom SLA / negotiated support | Tidak | Tidak | Tidak | Tidak | Tidak | Ya |

Catatan:

- `Optional` berarti boleh diaktifkan lewat feature flag jika strategi sales membutuhkannya
- untuk implementasi awal, limit usage lebih prioritas daripada gating fitur yang kompleks

## Definisi Usage Resmi

Semua fase berikutnya harus memakai definisi ini.

| Metric | Definisi resmi | Query source utama |
|---|---|---|
| `outletCount` | jumlah `Outlet` dengan `status = ACTIVE` untuk satu `businessId` | `outlets` |
| `userCount` | jumlah `BusinessUser` dengan `status = ACTIVE` untuk satu `businessId` | `business_users` |
| `productCount` | jumlah `Product` dengan `status = ACTIVE` untuk satu `businessId` | `products` |
| `transactionCount` | jumlah `Order` milik business pada bulan berjalan dengan `status = COMPLETED` dan `paymentStatus = PAID` | `orders` |

Aturan tambahan:

- jangan hitung `Payment` row untuk monthly transaction karena satu order dapat memiliki lebih dari satu payment
- product yang nonaktif di `ProductOutletSetting` tetapi product master masih `ACTIVE` tetap dihitung sebagai 1 product aktif bisnis
- outlet `INACTIVE`, user `INACTIVE`, dan product `INACTIVE` tidak dihitung ke limit
- timezone billing bulanan mengikuti timezone bisnis yang nanti didefinisikan sistem; sebelum ada field khusus, gunakan timezone server aplikasi sebagai baseline implementasi

## Policy Enforcement

### Rekomendasi Enforcement Model

| Limit type | Warning | Hard block | Grace period |
|---|---|---|---|
| Outlet | 80%, 90%, 100% | Ya | Tidak |
| User | 80%, 90%, 100% | Ya | Tidak |
| Product | 80%, 90%, 100% | Ya | Tidak |
| Monthly transaction | 80%, 90%, 100% | Ya | Tidak |
| Invoice overdue | H-3, H0, H+3 | Tidak langsung | Ya |

Keputusan final yang direkomendasikan:

- limit struktural (`outlet`, `user`, `product`) memakai `hard block` pada create atau activate
- limit transaksi bulanan memakai warning sebelum limit dan `hard block` ketika transaksi baru akan membuat usage melewati limit
- billing overdue tidak langsung block; pakai `grace period`

### Titik Block per Resource

| Resource | Titik block yang direkomendasikan |
|---|---|
| Outlet | saat create outlet baru atau re-activate outlet |
| User | saat create business user baru atau re-activate business user |
| Product | saat create product baru atau re-activate product |
| Transaction | saat finalisasi transaksi yang membuat `Order` menjadi billable (`COMPLETED` + `PAID`) |

Keputusan ini dipilih agar:

- abandoned draft order tidak ikut memakan kuota
- partial payment tidak menggandakan hitungan transaksi
- flow restaurant tetap aman karena billing menghitung transaksi yang benar-benar selesai

## Subscription Status Final

| Status | Arti | Boleh akses dashboard | Boleh transaksi baru | Catatan |
|---|---|---|---|---|
| `TRIAL` | masa trial aktif | Ya | Ya | semua limit tetap berlaku |
| `ACTIVE` | subscription sehat | Ya | Ya | status normal |
| `PAST_DUE` | invoice lewat jatuh tempo tapi masih grace period | Ya | Ya | tampilkan warning kuat |
| `SUSPENDED` | grace period habis / suspend manual | Ya, read-only terbatas | Tidak | owner masih bisa lihat billing dan invoice |
| `CANCELLED` | subscription berakhir dan tidak diperpanjang | Ya, read-only sangat terbatas | Tidak | tidak hard delete data |

Aturan turunan:

- satu business hanya boleh punya satu subscription aktif pada satu waktu
- `cancelAtPeriodEnd = true` mengarah ke `CANCELLED` setelah `currentPeriodEnd`
- `SUSPENDED` tidak boleh menghapus data bisnis, hanya membatasi operasional

## Trial Policy

Rekomendasi default:

| Rule | Keputusan |
|---|---|
| Trial duration | 14 hari |
| Default initial status | `TRIAL` |
| Trial plan baseline | `STARTER` dengan entitlement sesuai plan target onboarding |
| Convert to paid | manual activation setelah invoice pertama dibayar |

Catatan:

- bila sales model membutuhkan onboarding assisted, super admin boleh set business langsung ke `ACTIVE`
- trial tanpa kartu kredit lebih aman untuk fase awal

## Invoice & Billing Rule

### Billing Cycle

| Rule | Keputusan yang direkomendasikan |
|---|---|
| Billing interval | bulanan |
| Invoice generation | `H-7` sebelum renewal |
| Invoice due date | tepat pada `currentPeriodEnd` / renewal date |
| Reminder schedule | `H-3`, `H0`, `H+3` |
| Grace period | 7 hari setelah due date |
| Recurring mechanism awal | recurring invoice manual, tanpa auto charge |

### Invoice Status

| Status | Arti |
|---|---|
| `DRAFT` | invoice dibuat sistem tapi belum diterbitkan |
| `ISSUED` | invoice resmi aktif dan menunggu pembayaran |
| `PAID` | invoice lunas |
| `OVERDUE` | jatuh tempo lewat dan belum lunas |
| `VOID` | invoice dibatalkan secara administratif |

Keputusan operasional:

- invoice renewal dibuat satu kali per business per billing period
- invoice duplicate untuk `businessId + billingPeriodStart + billingPeriodEnd` tidak boleh terjadi
- manual payment recording boleh dipakai pada fase awal
- payment gateway webhook baru masuk Fase 7

## Upgrade & Downgrade Rule

### Upgrade

| Rule | Keputusan yang direkomendasikan |
|---|---|
| Efektif upgrade | langsung aktif saat disetujui |
| Prorate | tidak diaktifkan di fase awal |
| Selisih tagihan | dibawa ke invoice berikutnya atau dicatat manual oleh admin |
| Period end | tidak berubah |

Alasan:

- upgrade langsung mengurangi friction sales
- tanpa prorate jauh lebih aman untuk implementasi awal
- menghindari kalkulasi partial month yang rawan bug

### Downgrade

| Rule | Keputusan yang direkomendasikan |
|---|---|
| Efektif downgrade | `currentPeriodEnd` |
| Validasi usage saat request | wajib |
| Validasi usage sebelum apply | wajib ulang |
| Jika usage melebihi target plan | downgrade ditolak |

Aturan penting:

- downgrade tidak boleh membuat data existing menjadi invalid
- bila usage masih di atas limit target, owner harus menurunkan usage lebih dulu

## Suspend Rule

Rekomendasi suspend awal:

| Kondisi | Aksi |
|---|---|
| Due date terlewat | ubah ke `PAST_DUE` |
| Grace period selesai dan belum bayar | ubah ke `SUSPENDED` |
| Status `SUSPENDED` | blok transaksi baru, blok create/update resource yang menambah usage |
| Status `SUSPENDED` | owner masih bisa login untuk lihat billing page, invoice, dan instruksi pembayaran |

Keputusan ini paling aman karena:

- bisnis masih bisa menyelesaikan komunikasi tagihan
- tim support masih punya jalur recovery yang jelas
- data historis tidak hilang

## Authorization Rule

| Action | Role minimal |
|---|---|
| Lihat billing page | `OWNER` |
| Lihat invoice list/detail | `OWNER` |
| Ajukan upgrade/downgrade | `OWNER` |
| Record manual payment | `SUPER_ADMIN` atau admin finance platform |
| Suspend/reactivate manual | `SUPER_ADMIN` |

Catatan:

- jika nanti `ADMIN` bisnis perlu melihat invoice, itu harus jadi keputusan eksplisit baru
- default fase awal tetap owner-centric agar risiko billing lebih kecil

## Decision Summary

| Area | Keputusan lock |
|---|---|
| Model billing awal | recurring invoice manual |
| Auto charge | belum |
| Upgrade | langsung aktif, tanpa prorate |
| Downgrade | berlaku akhir periode |
| Structural limits | hard block |
| Billing overdue | grace period 7 hari |
| Invoice generation | H-7 |
| Transaction usage counter | hitung dari `Order COMPLETED + PAID` |
| Subscription scope | 1 business = 1 subscription aktif |
| Suspend behavior | dashboard billing tetap bisa diakses, transaksi baru diblok |

## Acceptance Criteria Fase 0

Fase 0 dianggap selesai jika:

- paket final, limit, dan status sudah punya satu sumber kebenaran
- definisi usage resmi sudah disetujui
- rule upgrade/downgrade sudah tidak ambigu
- rule invoice recurring awal sudah tidak ambigu
- tim implementasi Fase 1 bisa membuat schema tanpa menunggu keputusan bisnis tambahan yang besar

## Risiko & Impact Analysis

| Area | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| Database | schema sering berubah jika rules belum lock | migration churn | pakai dokumen ini sebagai baseline sebelum Fase 1 |
| Backend | usage counter salah definisi | false block / revenue leak | gunakan definisi usage resmi di dokumen ini |
| Frontend | UI billing tidak sinkron dengan status | user bingung | gunakan status matrix yang sama di web |
| Support/Ops | invoice jatuh tempo tidak konsisten | penagihan kacau | lock reminder dan grace period |
| Sales | plan overlap terlalu mirip | positioning lemah | gunakan perbedaan limit + entitlement |

## Test Scenario Minimum

### Functional

- business baru masuk `TRIAL` 14 hari
- owner hanya melihat billing milik business sendiri
- retail tidak bisa memilih plan `RESTAURANT`
- restaurant tidak bisa memilih plan `RETAIL_PRO`

### Validation

- create outlet ke-2 pada `STARTER` harus ditolak
- create user aktif ke-4 pada `STARTER` harus ditolak
- create product aktif ke-101 pada `STARTER` harus ditolak
- transaksi yang membuat count melebihi limit harus ditolak

### Billing

- invoice recurring `H-7` hanya dibuat satu kali untuk period yang sama
- due date lewat mengubah status ke `PAST_DUE`
- grace period habis mengubah status ke `SUSPENDED`
- pembayaran invoice mengubah invoice ke `PAID` dan subscription kembali `ACTIVE`

### Upgrade/Downgrade

- upgrade langsung mengubah limit aktif tanpa mengubah `currentPeriodEnd`
- downgrade terjadwal tidak aktif sebelum period end
- downgrade ditolak jika usage aktual di atas target plan

### Regression

- business existing tanpa subscription baru tetap bisa dimigrasikan dengan default seed plan
- perhitungan transaksi tidak double count walau satu order punya beberapa payment row

## Handoff ke Fase 1

Tim implementasi Fase 1 harus mengikuti keputusan ini:

1. buat model subscription dengan satu subscription aktif per business
2. simpan harga plan sebagai pre-tax monthly price
3. simpan compatibility plan terhadap `BusinessType`
4. siapkan unique guard untuk invoice period agar tidak duplicate
5. siapkan field grace period dan cancel-at-period-end sejak awal
6. definisikan usage snapshot bulanan tetapi source of truth awal tetap query data live

## Keputusan yang Boleh Diubah Nanti

Area berikut boleh berkembang setelah fase awal, tetapi jangan mengubah baseline Fase 1 tanpa revisi dokumen:

- nominal harga
- plan enterprise custom detail
- payment gateway pilihan
- proration penuh
- annual billing
- add-on feature per plan

## Ringkasan Final

Jika tidak ada keputusan bisnis lain, subscription/billing POS Platform berjalan dengan baseline berikut:

- enam paket: `Starter`, `Basic`, `Restaurant`, `Retail Pro`, `Business`, `Enterprise`
- limit dihitung dari outlet aktif, business user aktif, product aktif, dan order `COMPLETED + PAID`
- recurring billing dimulai dari invoice manual bulanan
- upgrade aktif langsung tanpa prorate
- downgrade berlaku akhir periode
- overdue masuk `PAST_DUE`, lalu `SUSPENDED` setelah grace period 7 hari
- owner tetap bisa melihat billing saat suspended, tetapi transaksi baru diblok

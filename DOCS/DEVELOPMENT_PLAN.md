# Development Plan — Platform Multi-Vertical

**Versi:** 1.0  
**Tanggal:** 2026-05-07  
**Untuk:** Junior Developer / AI Assistant

---

## Cara Membaca Dokumen Ini

Dokumen ini berisi rencana pengembangan lengkap platform POS multi-vertical.  
Setiap task ditulis **se-spesifik mungkin** agar bisa langsung dikerjakan tanpa menebak-nebak.

**Format task:**
```
[NOMOR] Nama Task
Tujuan: apa yang ingin dicapai
File: file yang harus dibuat atau diubah
Langkah: urutan pekerjaan yang harus dilakukan
Contoh: contoh kode atau data
Selesai jika: kriteria task dianggap done
```

---

## Gambaran Arsitektur Target

```
Core Platform (shared semua vertical)
├── Auth & Session
├── Billing & Subscription
├── Business & Tenant Management
├── Outlet Management
├── User & Role
├── Payment
└── Reporting Base

Vertical (domain operasional berbeda)
├── Retail   → toko, counter HP, grocery, apotek
├── FNB      → cafe, warung, restoran
└── Service  → bengkel, service HP, jasa servis

Feature Module (add-on per paket)
├── Antrian        → semua vertical bisa pakai
└── Expiry/Batch   → retail apotek, FNB
```

---

## Struktur Kode yang Sudah Ada

### Backend (`pos_api/src/`)

```
src/
├── app.ts                  ← setup Express app
├── server.ts               ← start server
├── config/
│   └── prisma.ts           ← Prisma client singleton
├── middlewares/
│   ├── auth.middleware.ts            ← cek JWT token
│   ├── business-access.middleware.ts ← cek akses business
│   ├── require-business-permission.middleware.ts ← cek permission
│   └── validate.middleware.ts        ← validasi request dengan Zod
├── modules/
│   └── [nama-modul]/
│       ├── nama.controller.ts   ← handle HTTP request/response
│       ├── nama.routes.ts       ← daftarkan endpoint
│       ├── nama.service.ts      ← logika bisnis
│       ├── nama.types.ts        ← TypeScript types & DTO
│       └── nama.validation.ts   ← Zod schema validasi
├── routes/
│   └── index.ts            ← daftarkan semua modul routes
└── utils/
    ├── api-response.ts     ← helper format response
    └── jwt.ts              ← helper JWT
```

### Pola Module (WAJIB IKUTI)

Setiap modul baru **harus** mengikuti pola ini persis:

**1. `.types.ts`** — definisi TypeScript
```typescript
// Tipe untuk input dari request
export type CreateXxxInput = { ... }

// Tipe untuk output ke response (DTO = Data Transfer Object)
export type XxxDto = { ... }
```

**2. `.validation.ts`** — validasi dengan Zod
```typescript
import { z } from 'zod';

export const createXxxSchema = z.object({
  body: z.object({ ... }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});
```

**3. `.service.ts`** — logika bisnis, query database
```typescript
import { prisma } from '../../config/prisma';

export async function createXxx(input: CreateXxxInput): Promise<XxxDto> {
  const result = await prisma.xxx.create({ data: input });
  return result;
}
```

**4. `.controller.ts`** — terima request, panggil service, kirim response
```typescript
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import { createXxx } from './xxx.service';

export async function createXxxHandler(req: Request, res: Response) {
  const result = await createXxx(req.body);
  return res.json(successResponse(result));
}
```

**5. `.routes.ts`** — daftarkan endpoint dengan middleware
```typescript
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { validate } from '../../middlewares/validate.middleware';
import { createXxxSchema } from './xxx.validation';
import { createXxxHandler } from './xxx.controller';

const router = Router();

router.post(
  '/',
  authMiddleware,
  businessAccessMiddleware,
  validate(createXxxSchema),
  createXxxHandler,
);

export default router;
```

**6. Daftarkan di `routes/index.ts`**
```typescript
import xxxRoutes from '../modules/xxx/xxx.routes';
router.use('/xxx', xxxRoutes);
```

### Frontend (`pos_web/src/`)

```
src/
├── app/
│   ├── login/              ← halaman login
│   └── dashboard/          ← semua halaman setelah login
│       ├── layout.tsx      ← sidebar, header, auth check
│       ├── page.tsx        ← halaman awal dashboard
│       └── [fitur]/
│           ├── page.tsx    ← list page
│           ├── create/
│           │   └── page.tsx ← create form
│           └── [id]/
│               └── page.tsx ← detail/edit page
├── components/
│   ├── layout/
│   │   ├── app-header.tsx  ← header bar atas
│   │   └── app-sidebar.tsx ← sidebar navigasi
│   ├── ui/                 ← komponen UI dasar (button, input, dll)
│   └── forms/              ← form components
├── lib/
│   └── auth.ts             ← fungsi auth (getMe, logout, dll)
└── types/
    └── auth.ts             ← tipe CurrentUser
```

### Middleware yang Tersedia

| Middleware | Fungsi | Cara Pakai |
|---|---|---|
| `authMiddleware` | Cek JWT token valid | Wajib di semua route yang butuh login |
| `businessAccessMiddleware` | Cek akses business dari header `x-business-id` | Wajib di semua route business |
| `requireBusinessPermission(code)` | Cek user punya permission tertentu | Tambah setelah `businessAccessMiddleware` |
| `requireOutletAccess` | Cek user punya akses ke outlet | Tambah untuk route yang butuh outlet |
| `validate(schema)` | Validasi request dengan Zod schema | Tambah sebelum handler |

### Cara Akses Data di Service

```typescript
// Ambil data dari request (sudah di-set oleh middleware)
req.authUser.userId          // ID user yang login
req.businessAccess.businessId    // ID business yang aktif
req.businessAccess.businessType  // RETAIL | FNB | SERVICE
req.businessAccess.allowedOutletIds  // outlet yang boleh diakses
```

---

## PHASE 1 — Vertical-Aware Architecture

**Tujuan:** Platform bisa membedakan tampilan dan akses berdasarkan jenis bisnis (vertical).  
**Estimasi:** 3-4 minggu  
**Prasyarat:** -

---

### [1.1] Tambah BusinessType Baru ke Schema

**Tujuan:** Tambahkan nilai `SERVICE` dan `HEALTH` ke enum `BusinessType` di database.

**File:** `pos_api/prisma/schema.prisma`

**Langkah:**

1. Cari blok `enum BusinessType` di schema.prisma (sekitar baris 1222)
2. Ubah dari:
```prisma
enum BusinessType {
  RESTAURANT
  RETAIL
}
```
Menjadi:
```prisma
enum BusinessType {
  RESTAURANT
  RETAIL
  SERVICE
  HEALTH
}
```

3. Jalankan migration:
```bash
cd pos_api
npx prisma migrate dev --name add_service_health_business_type
```

4. Generate Prisma client:
```bash
npx prisma generate
```

**Selesai jika:**
- Migration berhasil tanpa error
- File `prisma/migrations/[timestamp]_add_service_health_business_type/migration.sql` terbuat
- Bisa buat business dengan type `SERVICE` atau `HEALTH` via API

---

### [1.2] Buat Middleware Vertical Guard

**Tujuan:** Middleware baru yang bisa membatasi route tertentu hanya untuk vertical tertentu.

**File yang dibuat:** `pos_api/src/middlewares/require-business-type.middleware.ts`

**Langkah:**

Buat file baru dengan isi:
```typescript
// pos_api/src/middlewares/require-business-type.middleware.ts
import { BusinessType } from '@prisma/client';
import { NextFunction, Request, Response } from 'express';
import { errorResponse } from '../utils/api-response';

/**
 * Middleware untuk membatasi akses route hanya untuk business type tertentu.
 *
 * Contoh penggunaan:
 *   router.get('/', authMiddleware, businessAccessMiddleware, requireBusinessType(['FNB']), handler)
 *
 * Jika business bukan FNB, akan return 403.
 */
export function requireBusinessType(allowedTypes: BusinessType[]) {
  return function (req: Request, res: Response, next: NextFunction) {
    const businessType = req.businessAccess?.businessType;

    if (!businessType) {
      return res.status(403).json(errorResponse('Business access tidak ditemukan'));
    }

    if (!allowedTypes.includes(businessType)) {
      return res.status(403).json(
        errorResponse(
          `Fitur ini tidak tersedia untuk jenis bisnis ${businessType}. Tersedia untuk: ${allowedTypes.join(', ')}`,
        ),
      );
    }

    return next();
  };
}
```

**Cara pakai di routes lain:**
```typescript
import { requireBusinessType } from '../../middlewares/require-business-type.middleware';

// Hanya untuk FNB
router.get('/kitchen', authMiddleware, businessAccessMiddleware, requireBusinessType(['RESTAURANT']), handler);

// Hanya untuk Service
router.get('/work-orders', authMiddleware, businessAccessMiddleware, requireBusinessType(['SERVICE']), handler);

// Untuk beberapa vertical sekaligus
router.get('/products', authMiddleware, businessAccessMiddleware, requireBusinessType(['RETAIL', 'HEALTH']), handler);
```

**Selesai jika:**
- File terbuat
- TypeScript tidak error saat compile
- Test manual: endpoint dengan guard `SERVICE` return 403 jika diakses dari business `RETAIL`

---

### [1.3] Tambah businessType ke Auth Response

**Tujuan:** Frontend perlu tahu `businessType` saat user login, supaya bisa render menu yang benar.

**File yang diubah:** `pos_api/src/modules/auth/auth.types.ts` dan `auth.mapper.ts`

**Langkah:**

1. Buka `auth.types.ts`, cari tipe `BusinessMembershipAccess`, pastikan ada field `businessType`:
```typescript
export type BusinessMembershipAccess = {
  businessUserId: string;
  businessId: string;
  businessName: string;
  businessType: string;  // ← pastikan field ini ada
  role: string;
  status: string;
  isPrimary: boolean;
  hasAllOutletAccess: boolean;
  allowedOutletIds: string[];
  permissions: string[];
};
```

2. Pastikan respons `GET /auth/me` sudah include `businessType`. Cek di `auth.service.ts` fungsi `getMe()` atau yang setara — pastikan field `businessType` dari table `businesses` di-include di query dan di-return.

**Selesai jika:**
- `GET /auth/me` response menyertakan field `businessType` di dalam data membership/business
- Nilai bisa `RETAIL`, `RESTAURANT`, `SERVICE`, atau `HEALTH`

---

### [1.4] Vertical-Aware Sidebar di Frontend

**Tujuan:** Menu sidebar menampilkan item yang relevan dengan jenis bisnis user.

**File yang diubah:** `pos_web/src/components/layout/app-sidebar.tsx`

**Langkah:**

1. Buat tipe data untuk item navigasi:
```typescript
type NavItem = {
  label: string;
  href: string;
  icon: string;            // nama icon
  verticals?: string[];    // kalau kosong = tampil di semua vertical
  permission?: string;     // permission yang dibutuhkan (opsional)
};
```

2. Buat definisi semua menu item dengan filter vertical:
```typescript
const NAV_ITEMS: NavItem[] = [
  // ── Semua Vertical ──
  { label: 'Dashboard',   href: '/dashboard',          icon: 'LayoutDashboard' },
  { label: 'Produk',      href: '/dashboard/products', icon: 'Package',         permission: 'PRODUCT_VIEW' },
  { label: 'Kategori',    href: '/dashboard/categories', icon: 'Tag',           permission: 'CATEGORY_VIEW' },
  { label: 'Outlet',      href: '/dashboard/outlets',  icon: 'Store',           permission: 'OUTLET_VIEW' },
  { label: 'Karyawan',    href: '/dashboard/business-users', icon: 'Users',     permission: 'BUSINESS_USER_VIEW' },
  { label: 'Laporan',     href: '/dashboard/reports',  icon: 'BarChart2',       permission: 'REPORT_VIEW' },
  { label: 'Pengaturan',  href: '/dashboard/settings', icon: 'Settings' },

  // ── Retail & Health saja ──
  { label: 'Supplier',         href: '/dashboard/suppliers',       icon: 'Truck',       verticals: ['RETAIL', 'HEALTH'], permission: 'SUPPLIER_VIEW' },
  { label: 'Purchase Order',   href: '/dashboard/purchase-orders', icon: 'ShoppingCart', verticals: ['RETAIL', 'HEALTH'], permission: 'SUPPLIER_VIEW' },
  { label: 'Penerimaan Barang',href: '/dashboard/goods-receipts',  icon: 'PackageCheck', verticals: ['RETAIL', 'HEALTH'] },
  { label: 'Inventori',        href: '/dashboard/inventory',       icon: 'Boxes',        verticals: ['RETAIL', 'HEALTH', 'RESTAURANT'], permission: 'INVENTORY_VIEW' },
  { label: 'Promo',            href: '/dashboard/promos',          icon: 'Percent',      verticals: ['RETAIL', 'HEALTH'], permission: 'PROMO_VIEW' },

  // ── FNB (Restaurant) saja ──
  { label: 'Meja',         href: '/dashboard/outlet-tables', icon: 'UtensilsCrossed', verticals: ['RESTAURANT'], permission: 'OUTLET_TABLE_VIEW' },
  { label: 'Kitchen',      href: '/dashboard/kitchen',       icon: 'ChefHat',         verticals: ['RESTAURANT'] },
  { label: 'Promo',        href: '/dashboard/promos',        icon: 'Percent',         verticals: ['RESTAURANT'], permission: 'PROMO_VIEW' },

  // ── Service saja ──
  { label: 'Work Order',   href: '/dashboard/work-orders',   icon: 'ClipboardList',   verticals: ['SERVICE'] },
  { label: 'Antrian',      href: '/dashboard/antrian',       icon: 'ListOrdered',     verticals: ['SERVICE'] },
];
```

3. Di komponen sidebar, filter menu berdasarkan `businessType` user:
```typescript
// ambil businessType dari state user yang sudah login
const businessType = currentUser?.defaultBusiness?.businessType ?? 'RETAIL';

const visibleNavItems = NAV_ITEMS.filter((item) => {
  // kalau tidak ada filter vertical, tampilkan di semua vertical
  if (!item.verticals || item.verticals.length === 0) return true;
  return item.verticals.includes(businessType);
});
```

**Selesai jika:**
- Login sebagai business RETAIL: tidak ada menu Kitchen, Meja, Work Order
- Login sebagai business RESTAURANT: tidak ada menu Supplier, Purchase Order, Work Order
- Login sebagai business SERVICE: tidak ada menu Kitchen, Meja, Purchase Order

---

### [1.5] Halaman POS Kasir — Retail Mode

**Tujuan:** Tampilan kasir untuk Retail bersih, tanpa elemen F&B (meja, tipe order dine-in/takeaway).

**File yang diubah:** `pos_web/src/app/dashboard/pos/page.tsx`

**Langkah:**

1. Ambil `businessType` dari context/state user
2. Sembunyikan komponen yang tidak relevan berdasarkan `businessType`:
```typescript
{businessType === 'RESTAURANT' && (
  <TableSelector />         // pilih meja
)}

{businessType === 'RESTAURANT' && (
  <OrderTypeSelector />     // dine-in vs takeaway
)}
```

3. Tampilkan label yang sesuai:
```typescript
const pageTitle = businessType === 'RESTAURANT' ? 'Kasir Restoran' : 'Kasir';
```

**Selesai jika:**
- Kasir Retail: tidak ada pilihan meja, tidak ada dine-in/takeaway
- Kasir FNB: semua opsi tampil normal

---

## PHASE 2 — F&B Polish

**Tujuan:** Tampilan dan flow F&B terasa natural untuk owner cafe/warung.  
**Estimasi:** 2-3 minggu  
**Prasyarat:** Phase 1 selesai

---

### [2.1] Dashboard F&B

**Tujuan:** Halaman dashboard untuk business FNB menampilkan informasi yang relevan.

**File yang diubah:** `pos_web/src/app/dashboard/page.tsx`

**Langkah:**

1. Buat komponen terpisah per vertical:
   - `pos_web/src/components/dashboard/RetailDashboard.tsx`
   - `pos_web/src/components/dashboard/FnbDashboard.tsx`
   - `pos_web/src/components/dashboard/ServiceDashboard.tsx`

2. Di `page.tsx` root dashboard, render berdasarkan `businessType`:
```typescript
if (businessType === 'RESTAURANT') return <FnbDashboard />;
if (businessType === 'SERVICE') return <ServiceDashboard />;
return <RetailDashboard />;
```

3. Isi `FnbDashboard.tsx`:
```
Kartu: Total order hari ini
Kartu: Revenue hari ini
Kartu: Meja aktif / total meja
Kartu: Order menunggu di kitchen
Tabel: 5 order terbaru
```

4. Isi `RetailDashboard.tsx`:
```
Kartu: Total transaksi hari ini
Kartu: Revenue hari ini
Kartu: Produk stok menipis (stok < 10)
Kartu: Total customer hari ini
Tabel: 5 transaksi terbaru
```

**Selesai jika:**
- Business FNB: lihat kartu meja aktif dan kitchen queue
- Business Retail: lihat kartu stok menipis

---

### [2.2] Kitchen Display — Perbaikan UI

**Tujuan:** Halaman kitchen display yang lebih proper untuk dipakai di dapur.

**File yang diubah:** `pos_web/src/app/dashboard/kitchen/page.tsx`

**Langkah:**

1. Layout fullscreen grid:
   - Kolom kiri: Order baru / sedang diproses
   - Kolom kanan: Order siap disajikan

2. Setiap card order tampilkan:
   - Nomor meja atau nama order
   - Waktu order dibuat (berapa menit lalu)
   - List item yang dipesan + qty
   - Tombol "Mulai Proses" dan "Siap Saji"

3. Refresh otomatis setiap 15 detik (gunakan `setInterval` + fetch)

4. Warna status:
   - Baru: warna kuning
   - Diproses: warna biru
   - Siap: warna hijau

**API yang dipakai:** `GET /kitchen/orders?outletId=xxx` (sudah ada)

**Selesai jika:**
- Halaman bisa dipakai tanpa scroll di monitor standar
- Auto-refresh berjalan
- Status order bisa diubah dari halaman ini

---

### [2.3] Guest Menu (QR Order)

**Tujuan:** Customer bisa scan QR di meja dan order langsung dari HP.

**File yang diubah:** `pos_web/src/app/dashboard/guest/`

**Langkah:**

1. Flow yang sudah ada di backend, pastikan frontend-nya smooth:
   - Customer scan QR → masuk ke `/guest/menu?outletId=xxx&tableId=xxx`
   - Customer pilih menu → checkout → order masuk ke sistem

2. Halaman `/guest/menu`:
   - Tampilkan nama outlet dan meja
   - Grid produk dengan gambar, nama, harga
   - Cart di bawah (sticky bottom)
   - Tombol "Pesan Sekarang"

3. Halaman `/guest/checkout`:
   - Summary order
   - Tombol konfirmasi
   - Setelah submit: tampilkan "Order berhasil, nomor order: #xxx"

**Selesai jika:**
- Flow end-to-end bisa dicoba dari HP tanpa error
- Order muncul di kitchen display setelah customer submit

---

## PHASE 3 — Service Vertical (Bengkel & Service HP)

**Tujuan:** Buat vertical baru untuk bisnis jasa/servis.  
**Estimasi:** 4-6 minggu  
**Prasyarat:** Phase 1 selesai

---

### [3.1] Schema Database Work Order

**Tujuan:** Buat tabel-tabel untuk sistem work order.

**File yang diubah:** `pos_api/prisma/schema.prisma`

**Langkah:**

Tambahkan model-model berikut ke schema.prisma:

```prisma
// ─── WORK ORDER MODELS ─────────────────────────────────────

model WorkOrder {
  id              String          @id @default(cuid())
  businessId      String
  outletId        String
  woNumber        String          // nomor WO, contoh: WO-20260507-001
  customerId      String?         // opsional, kalau customer sudah terdaftar
  customerName    String          // nama customer
  customerPhone   String          // nomor HP customer
  deviceType      String          // "Motor", "Mobil", "HP", "Laptop", dll
  deviceBrand     String?         // merk, contoh: "Honda", "Samsung"
  deviceModel     String?         // model, contoh: "Beat 2020", "Galaxy A54"
  deviceCondition String?         // kondisi awal device saat diterima
  complaint       String          // keluhan customer
  status          WorkOrderStatus @default(RECEIVED)
  estimatedCost   Decimal?        @db.Decimal(14, 2)
  finalCost       Decimal?        @db.Decimal(14, 2)
  assignedToId    String?         // business user (teknisi) yang handle
  receivedAt      DateTime        @default(now())
  estimatedDoneAt DateTime?
  startedAt       DateTime?
  completedAt     DateTime?
  pickedUpAt      DateTime?
  notes           String?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  business   Business     @relation(fields: [businessId], references: [id], onDelete: Cascade)
  outlet     Outlet       @relation(fields: [outletId], references: [id])
  assignedTo BusinessUser? @relation("AssignedWorkOrders", fields: [assignedToId], references: [id])
  items      WorkOrderItem[]
  statusLogs WorkOrderStatusLog[]

  @@index([businessId, status])
  @@index([outletId, status])
  @@index([customerPhone])
  @@map("work_orders")
}

model WorkOrderItem {
  id          String   @id @default(cuid())
  workOrderId String
  type        WorkOrderItemType
  name        String           // nama jasa atau spare part
  qty         Int              @default(1)
  unitPrice   Decimal          @db.Decimal(14, 2)
  totalPrice  Decimal          @db.Decimal(14, 2)
  productId   String?          // kalau spare part dari stok produk
  notes       String?
  createdAt   DateTime         @default(now())

  workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)

  @@index([workOrderId])
  @@map("work_order_items")
}

model WorkOrderStatusLog {
  id          String          @id @default(cuid())
  workOrderId String
  fromStatus  WorkOrderStatus?
  toStatus    WorkOrderStatus
  note        String?
  changedById String?
  changedAt   DateTime        @default(now())

  workOrder WorkOrder @relation(fields: [workOrderId], references: [id], onDelete: Cascade)

  @@index([workOrderId])
  @@map("work_order_status_logs")
}

// ─── ENUM TAMBAHAN ─────────────────────────────────────────

enum WorkOrderStatus {
  RECEIVED       // baru diterima
  DIAGNOSED      // sudah dicek, menunggu persetujuan biaya
  WAITING_PARTS  // nunggu spare part
  IN_PROGRESS    // sedang dikerjakan
  DONE           // selesai dikerjakan, nunggu diambil
  PICKED_UP      // sudah diambil customer
  CANCELLED      // dibatalkan
}

enum WorkOrderItemType {
  SERVICE    // jasa/ongkos kerja
  PART       // spare part
}
```

Setelah tambah model, jalankan:
```bash
cd pos_api
npx prisma migrate dev --name add_work_order_models
npx prisma generate
```

**Selesai jika:**
- Migration berhasil
- Tabel `work_orders`, `work_order_items`, `work_order_status_logs` ada di database
- Bisa dicek dengan: `npx prisma studio`

---

### [3.2] Backend — Work Order Module

**Tujuan:** Buat API untuk create, list, update status work order.

**File yang dibuat:**
```
pos_api/src/modules/work-orders/
├── work-order.types.ts
├── work-order.validation.ts
├── work-order.service.ts
├── work-order.controller.ts
└── work-order.routes.ts
```

---

#### [3.2.1] `work-order.types.ts`

```typescript
export type CreateWorkOrderInput = {
  outletId: string;
  businessId: string;
  customerName: string;
  customerPhone: string;
  deviceType: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceCondition?: string;
  complaint: string;
  estimatedCost?: string;
  estimatedDoneAt?: string;
  assignedToId?: string;
};

export type UpdateWorkOrderStatusInput = {
  workOrderId: string;
  businessId: string;
  status: string;
  note?: string;
  changedById?: string;
};

export type AddWorkOrderItemInput = {
  workOrderId: string;
  businessId: string;
  type: 'SERVICE' | 'PART';
  name: string;
  qty: number;
  unitPrice: string;
  productId?: string;
  notes?: string;
};

export type ListWorkOrdersInput = {
  businessId: string;
  outletId?: string;
  status?: string;
  search?: string;
  page?: number;
  perPage?: number;
};

export type WorkOrderDto = {
  id: string;
  woNumber: string;
  customerName: string;
  customerPhone: string;
  deviceType: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  complaint: string;
  status: string;
  estimatedCost: string | null;
  finalCost: string | null;
  receivedAt: string;
  estimatedDoneAt: string | null;
  assignedTo: { id: string; user: { fullName: string } } | null;
  items: WorkOrderItemDto[];
};

export type WorkOrderItemDto = {
  id: string;
  type: string;
  name: string;
  qty: number;
  unitPrice: string;
  totalPrice: string;
};
```

---

#### [3.2.2] `work-order.validation.ts`

```typescript
import { z } from 'zod';
import { WorkOrderStatus, WorkOrderItemType } from '@prisma/client';

const cuidSchema = z.string().cuid();

export const createWorkOrderSchema = z.object({
  body: z.object({
    outletId: cuidSchema,
    customerName: z.string().trim().min(1, 'Nama customer wajib diisi'),
    customerPhone: z.string().trim().min(1, 'Nomor HP wajib diisi'),
    deviceType: z.string().trim().min(1, 'Jenis device wajib diisi'),
    deviceBrand: z.string().trim().optional(),
    deviceModel: z.string().trim().optional(),
    deviceCondition: z.string().trim().optional(),
    complaint: z.string().trim().min(1, 'Keluhan wajib diisi'),
    estimatedCost: z.string().optional(),
    estimatedDoneAt: z.string().datetime().optional(),
    assignedToId: cuidSchema.optional(),
  }),
  params: z.object({}).optional(),
  query: z.object({}).optional(),
});

export const updateWorkOrderStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(WorkOrderStatus),
    note: z.string().trim().optional(),
  }),
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({}).optional(),
});

export const addWorkOrderItemSchema = z.object({
  body: z.object({
    type: z.nativeEnum(WorkOrderItemType),
    name: z.string().trim().min(1),
    qty: z.number().int().min(1),
    unitPrice: z.string(),
    productId: cuidSchema.optional(),
    notes: z.string().trim().optional(),
  }),
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({}).optional(),
});

export const listWorkOrdersSchema = z.object({
  query: z.object({
    outletId: cuidSchema.optional(),
    status: z.nativeEnum(WorkOrderStatus).optional(),
    search: z.string().trim().optional(),
    page: z.coerce.number().int().min(1).optional(),
    perPage: z.coerce.number().int().min(1).max(100).optional(),
  }),
  body: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const getWorkOrderByIdSchema = z.object({
  params: z.object({
    id: cuidSchema,
  }),
  query: z.object({}).optional(),
  body: z.object({}).optional(),
});
```

---

#### [3.2.3] `work-order.service.ts`

```typescript
import { prisma } from '../../config/prisma';
import type {
  CreateWorkOrderInput,
  AddWorkOrderItemInput,
  ListWorkOrdersInput,
  UpdateWorkOrderStatusInput,
  WorkOrderDto,
} from './work-order.types';

// Buat nomor WO: WO-YYYYMMDD-001
async function generateWoNumber(tx: typeof prisma): Promise<string> {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  const prefix = `WO-${y}${m}${d}`;

  const latest = await tx.workOrder.findFirst({
    where: { woNumber: { startsWith: prefix } },
    orderBy: { woNumber: 'desc' },
    select: { woNumber: true },
  });

  const seq = latest
    ? parseInt(latest.woNumber.split('-')[3] ?? '0', 10) + 1
    : 1;

  return `${prefix}-${String(seq).padStart(3, '0')}`;
}

export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrderDto> {
  return prisma.$transaction(async (tx) => {
    const woNumber = await generateWoNumber(tx);

    const wo = await tx.workOrder.create({
      data: {
        businessId: input.businessId,
        outletId: input.outletId,
        woNumber,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        deviceType: input.deviceType,
        deviceBrand: input.deviceBrand,
        deviceModel: input.deviceModel,
        deviceCondition: input.deviceCondition,
        complaint: input.complaint,
        estimatedCost: input.estimatedCost,
        estimatedDoneAt: input.estimatedDoneAt ? new Date(input.estimatedDoneAt) : null,
        assignedToId: input.assignedToId,
        status: 'RECEIVED',
      },
      include: { items: true, assignedTo: { include: { user: { select: { fullName: true } } } } },
    });

    await tx.workOrderStatusLog.create({
      data: {
        workOrderId: wo.id,
        toStatus: 'RECEIVED',
      },
    });

    return mapWorkOrderToDto(wo);
  });
}

export async function updateWorkOrderStatus(input: UpdateWorkOrderStatusInput) {
  return prisma.$transaction(async (tx) => {
    const wo = await tx.workOrder.findFirst({
      where: { id: input.workOrderId, businessId: input.businessId },
    });

    if (!wo) throw new Error('Work order tidak ditemukan');

    const updated = await tx.workOrder.update({
      where: { id: input.workOrderId },
      data: {
        status: input.status as any,
        startedAt: input.status === 'IN_PROGRESS' ? new Date() : undefined,
        completedAt: input.status === 'DONE' ? new Date() : undefined,
        pickedUpAt: input.status === 'PICKED_UP' ? new Date() : undefined,
      },
      include: { items: true, assignedTo: { include: { user: { select: { fullName: true } } } } },
    });

    await tx.workOrderStatusLog.create({
      data: {
        workOrderId: wo.id,
        fromStatus: wo.status,
        toStatus: input.status as any,
        note: input.note,
        changedById: input.changedById,
      },
    });

    return mapWorkOrderToDto(updated);
  });
}

export async function addWorkOrderItem(input: AddWorkOrderItemInput) {
  const wo = await prisma.workOrder.findFirst({
    where: { id: input.workOrderId, businessId: input.businessId },
  });

  if (!wo) throw new Error('Work order tidak ditemukan');

  const unitPrice = parseFloat(input.unitPrice);
  const totalPrice = unitPrice * input.qty;

  return prisma.workOrderItem.create({
    data: {
      workOrderId: input.workOrderId,
      type: input.type,
      name: input.name,
      qty: input.qty,
      unitPrice: unitPrice,
      totalPrice: totalPrice,
      productId: input.productId,
      notes: input.notes,
    },
  });
}

export async function listWorkOrders(input: ListWorkOrdersInput) {
  const page = input.page ?? 1;
  const perPage = input.perPage ?? 20;
  const skip = (page - 1) * perPage;

  const where: any = { businessId: input.businessId };
  if (input.outletId) where.outletId = input.outletId;
  if (input.status) where.status = input.status;
  if (input.search) {
    where.OR = [
      { woNumber: { contains: input.search, mode: 'insensitive' } },
      { customerName: { contains: input.search, mode: 'insensitive' } },
      { customerPhone: { contains: input.search, mode: 'insensitive' } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.workOrder.findMany({
      where,
      skip,
      take: perPage,
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        assignedTo: { include: { user: { select: { fullName: true } } } },
      },
    }),
    prisma.workOrder.count({ where }),
  ]);

  return {
    data: data.map(mapWorkOrderToDto),
    meta: { total, page, perPage, totalPages: Math.ceil(total / perPage) },
  };
}

export async function getWorkOrderById(id: string, businessId: string) {
  const wo = await prisma.workOrder.findFirst({
    where: { id, businessId },
    include: {
      items: true,
      statusLogs: { orderBy: { changedAt: 'asc' } },
      assignedTo: { include: { user: { select: { fullName: true } } } },
    },
  });

  if (!wo) throw new Error('Work order tidak ditemukan');
  return mapWorkOrderToDto(wo);
}

function mapWorkOrderToDto(wo: any): WorkOrderDto {
  return {
    id: wo.id,
    woNumber: wo.woNumber,
    customerName: wo.customerName,
    customerPhone: wo.customerPhone,
    deviceType: wo.deviceType,
    deviceBrand: wo.deviceBrand,
    deviceModel: wo.deviceModel,
    complaint: wo.complaint,
    status: wo.status,
    estimatedCost: wo.estimatedCost?.toString() ?? null,
    finalCost: wo.finalCost?.toString() ?? null,
    receivedAt: wo.receivedAt.toISOString(),
    estimatedDoneAt: wo.estimatedDoneAt?.toISOString() ?? null,
    assignedTo: wo.assignedTo,
    items: (wo.items ?? []).map((item: any) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      qty: item.qty,
      unitPrice: item.unitPrice.toString(),
      totalPrice: item.totalPrice.toString(),
    })),
  };
}
```

---

#### [3.2.4] `work-order.controller.ts`

```typescript
import { Request, Response } from 'express';
import { successResponse, errorResponse } from '../../utils/api-response';
import {
  createWorkOrder,
  updateWorkOrderStatus,
  addWorkOrderItem,
  listWorkOrders,
  getWorkOrderById,
} from './work-order.service';

export async function listWorkOrdersHandler(req: Request, res: Response) {
  const result = await listWorkOrders({
    businessId: req.businessAccess!.businessId,
    outletId: req.query.outletId as string | undefined,
    status: req.query.status as string | undefined,
    search: req.query.search as string | undefined,
    page: req.query.page ? Number(req.query.page) : undefined,
    perPage: req.query.perPage ? Number(req.query.perPage) : undefined,
  });
  return res.json(successResponse(result));
}

export async function getWorkOrderByIdHandler(req: Request, res: Response) {
  const result = await getWorkOrderById(req.params.id, req.businessAccess!.businessId);
  return res.json(successResponse(result));
}

export async function createWorkOrderHandler(req: Request, res: Response) {
  const result = await createWorkOrder({
    ...req.body,
    businessId: req.businessAccess!.businessId,
  });
  return res.status(201).json(successResponse(result));
}

export async function updateWorkOrderStatusHandler(req: Request, res: Response) {
  const result = await updateWorkOrderStatus({
    workOrderId: req.params.id,
    businessId: req.businessAccess!.businessId,
    status: req.body.status,
    note: req.body.note,
    changedById: req.businessAccess!.businessUserId,
  });
  return res.json(successResponse(result));
}

export async function addWorkOrderItemHandler(req: Request, res: Response) {
  const result = await addWorkOrderItem({
    workOrderId: req.params.id,
    businessId: req.businessAccess!.businessId,
    ...req.body,
  });
  return res.status(201).json(successResponse(result));
}
```

---

#### [3.2.5] `work-order.routes.ts`

```typescript
import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessType } from '../../middlewares/require-business-type.middleware';
import { validate } from '../../middlewares/validate.middleware';
import {
  createWorkOrderSchema,
  updateWorkOrderStatusSchema,
  addWorkOrderItemSchema,
  listWorkOrdersSchema,
  getWorkOrderByIdSchema,
} from './work-order.validation';
import {
  listWorkOrdersHandler,
  getWorkOrderByIdHandler,
  createWorkOrderHandler,
  updateWorkOrderStatusHandler,
  addWorkOrderItemHandler,
} from './work-order.controller';

const router = Router();

// Semua route work order hanya untuk SERVICE vertical
const guardMiddlewares = [
  authMiddleware,
  businessAccessMiddleware,
  requireBusinessType(['SERVICE']),
];

// GET /work-orders — list semua WO
router.get('/', ...guardMiddlewares, validate(listWorkOrdersSchema), listWorkOrdersHandler);

// GET /work-orders/:id — detail satu WO
router.get('/:id', ...guardMiddlewares, validate(getWorkOrderByIdSchema), getWorkOrderByIdHandler);

// POST /work-orders — buat WO baru
router.post('/', ...guardMiddlewares, validate(createWorkOrderSchema), createWorkOrderHandler);

// PATCH /work-orders/:id/status — update status WO
router.patch('/:id/status', ...guardMiddlewares, validate(updateWorkOrderStatusSchema), updateWorkOrderStatusHandler);

// POST /work-orders/:id/items — tambah item ke WO
router.post('/:id/items', ...guardMiddlewares, validate(addWorkOrderItemSchema), addWorkOrderItemHandler);

export default router;
```

---

#### [3.2.6] Daftarkan di `routes/index.ts`

Tambahkan baris berikut ke `pos_api/src/routes/index.ts`:

```typescript
// Di bagian import (atas file)
import workOrderRoutes from '../modules/work-orders/work-order.routes';

// Di bagian router.use (bawah file)
router.use('/work-orders', workOrderRoutes);
```

**Selesai jika:**
```
POST /work-orders          → 201 berhasil buat WO baru
GET  /work-orders          → 200 return list WO
GET  /work-orders/:id      → 200 return detail WO
PATCH /work-orders/:id/status → 200 status berhasil diubah
POST /work-orders/:id/items   → 201 item berhasil ditambah
GET  /work-orders          dari business RETAIL → 403 Forbidden
```

---

### [3.3] Frontend — Halaman Work Order

**File yang dibuat:**
```
pos_web/src/app/dashboard/work-orders/
├── page.tsx           ← list work order
├── create/
│   └── page.tsx      ← form buat WO baru
└── [id]/
    └── page.tsx      ← detail WO + update status + tambah item
```

---

#### [3.3.1] Halaman List Work Order (`page.tsx`)

Tampilan:
```
[Header: Work Order]                    [Tombol: + Buat Work Order]

[Filter: Status dropdown] [Search: cari nama/nomor/HP]

[Tabel]
| No. WO       | Customer     | Device         | Status      | Teknisi   | Diterima   | Aksi   |
| WO-20260507-001 | Budi      | Motor Honda Beat | IN_PROGRESS | Andi    | 07 Mei     | Lihat  |
| WO-20260507-002 | Sari      | HP Samsung A54   | RECEIVED    | -       | 07 Mei     | Lihat  |
```

Status badge warna:
- `RECEIVED` → abu-abu
- `DIAGNOSED` → kuning
- `WAITING_PARTS` → oranye
- `IN_PROGRESS` → biru
- `DONE` → hijau
- `PICKED_UP` → hijau tua
- `CANCELLED` → merah

API call: `GET /work-orders?outletId=xxx&status=xxx&search=xxx`

---

#### [3.3.2] Form Buat Work Order (`create/page.tsx`)

Field:
```
Section: Informasi Customer
- Nama Customer (text, required)
- Nomor HP (text, required)

Section: Informasi Device
- Jenis Device (dropdown: Motor, Mobil, HP, Laptop, Lainnya)
- Merk (text, opsional)
- Model (text, opsional)
- Kondisi Saat Diterima (textarea, opsional) — contoh: "Layar retak di pojok kanan"

Section: Servis
- Keluhan (textarea, required) — contoh: "Mesin tidak mau hidup"
- Estimasi Biaya (number, opsional)
- Estimasi Selesai (date picker, opsional)
- Assign ke Teknisi (dropdown list BusinessUser, opsional)
- Outlet (dropdown, kalau user punya akses multi-outlet)

[Tombol: Batal] [Tombol: Buat Work Order]
```

API call: `POST /work-orders`

---

#### [3.3.3] Detail Work Order (`[id]/page.tsx`)

Layout:
```
[Header: WO-20260507-001]   [Status Badge: IN_PROGRESS]

Section kiri:
  Info Customer: Budi, 0812-xxxx
  Info Device: Motor Honda Beat 2020
  Keluhan: Mesin tidak mau hidup
  Kondisi Diterima: Bodi lecet di tangki
  Teknisi: Andi
  Diterima: 07 Mei 2026, 09:30
  Estimasi Selesai: 07 Mei 2026, 17:00

Section kanan:
  [Update Status]
  Dropdown pilih status baru → [Tombol: Update]
  Catatan (opsional)

  [Item Servis & Spare Part]
  | Item            | Tipe    | Qty | Harga      | Total      |
  | Ganti Oli       | SERVICE | 1   | 50.000     | 50.000     |
  | Filter Udara    | PART    | 1   | 35.000     | 35.000     |
  | Total                                         | 85.000     |

  [Tombol: + Tambah Item]
  Form tambah item:
  - Tipe (SERVICE / PART)
  - Nama
  - Qty
  - Harga Satuan

Timeline Status:
  ✓ RECEIVED — 07 Mei 09:30
  ✓ IN_PROGRESS — 07 Mei 10:15 — "Mulai cek mesin"
```

---

## PHASE 4 — Feature Module: Antrian

**Tujuan:** Sistem antrian yang bisa diaktifkan per outlet, tersedia untuk semua vertical.  
**Estimasi:** 3-4 minggu  
**Prasyarat:** Phase 1 selesai

---

### [4.1] Schema Database Antrian

**File yang diubah:** `pos_api/prisma/schema.prisma`

Tambahkan model berikut:

```prisma
// ─── ANTRIAN MODELS ────────────────────────────────────────

model QueueConfig {
  id            String   @id @default(cuid())
  outletId      String   @unique
  prefix        String   @default("A")    // prefix nomor, misal "A" → A001
  resetDaily    Boolean  @default(true)   // reset nomor tiap hari
  currentNumber Int      @default(0)      // nomor terakhir yang dikeluarkan
  calledNumber  Int?                      // nomor yang sedang dipanggil
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  outlet  Outlet        @relation(fields: [outletId], references: [id], onDelete: Cascade)
  tickets QueueTicket[]

  @@map("queue_configs")
}

model QueueTicket {
  id            String            @id @default(cuid())
  queueConfigId String
  ticketNumber  String            // contoh: A001
  sequenceNumber Int              // angka murninya: 1
  status        QueueTicketStatus @default(WAITING)
  calledAt      DateTime?
  servedAt      DateTime?
  skippedAt     DateTime?
  createdAt     DateTime          @default(now())

  queueConfig QueueConfig @relation(fields: [queueConfigId], references: [id], onDelete: Cascade)

  @@index([queueConfigId, status])
  @@index([queueConfigId, createdAt])
  @@map("queue_tickets")
}

enum QueueTicketStatus {
  WAITING   // menunggu dipanggil
  CALLED    // sudah dipanggil, belum dilayani
  SERVED    // sudah dilayani
  SKIPPED   // dilewati
}
```

Jalankan:
```bash
npx prisma migrate dev --name add_queue_models
npx prisma generate
```

---

### [4.2] Backend — Queue Module

**File yang dibuat:**
```
pos_api/src/modules/queue/
├── queue.types.ts
├── queue.validation.ts
├── queue.service.ts
├── queue.controller.ts
└── queue.routes.ts
```

---

#### [4.2.1] `queue.service.ts`

```typescript
import { prisma } from '../../config/prisma';

// Ambil atau buat konfigurasi antrian untuk outlet
export async function getOrCreateQueueConfig(outletId: string) {
  const existing = await prisma.queueConfig.findUnique({
    where: { outletId },
  });

  if (existing) return existing;

  return prisma.queueConfig.create({
    data: { outletId },
  });
}

// Customer ambil nomor antrian
export async function takeQueueTicket(outletId: string) {
  return prisma.$transaction(async (tx) => {
    const config = await tx.queueConfig.findUnique({ where: { outletId } });
    if (!config) throw new Error('Antrian belum dikonfigurasi untuk outlet ini');
    if (!config.isActive) throw new Error('Antrian sedang tidak aktif');

    const nextNumber = config.currentNumber + 1;
    const ticketNumber = `${config.prefix}${String(nextNumber).padStart(3, '0')}`;

    await tx.queueConfig.update({
      where: { outletId },
      data: { currentNumber: nextNumber },
    });

    const ticket = await tx.queueTicket.create({
      data: {
        queueConfigId: config.id,
        ticketNumber,
        sequenceNumber: nextNumber,
        status: 'WAITING',
      },
    });

    return ticket;
  });
}

// Staff panggil nomor berikutnya
export async function callNextTicket(outletId: string) {
  return prisma.$transaction(async (tx) => {
    const config = await tx.queueConfig.findUnique({ where: { outletId } });
    if (!config) throw new Error('Antrian tidak ditemukan');

    // Cari tiket WAITING dengan nomor terkecil
    const nextTicket = await tx.queueTicket.findFirst({
      where: { queueConfigId: config.id, status: 'WAITING' },
      orderBy: { sequenceNumber: 'asc' },
    });

    if (!nextTicket) throw new Error('Tidak ada antrian yang menunggu');

    await tx.queueConfig.update({
      where: { outletId },
      data: { calledNumber: nextTicket.sequenceNumber },
    });

    const updated = await tx.queueTicket.update({
      where: { id: nextTicket.id },
      data: { status: 'CALLED', calledAt: new Date() },
    });

    return { config: { ...config, calledNumber: nextTicket.sequenceNumber }, ticket: updated };
  });
}

// Staff tandai sudah dilayani
export async function serveTicket(ticketId: string) {
  return prisma.queueTicket.update({
    where: { id: ticketId },
    data: { status: 'SERVED', servedAt: new Date() },
  });
}

// Staff skip (lewati)
export async function skipTicket(ticketId: string) {
  return prisma.queueTicket.update({
    where: { id: ticketId },
    data: { status: 'SKIPPED', skippedAt: new Date() },
  });
}

// Reset antrian harian
export async function resetDailyQueue(outletId: string) {
  return prisma.$transaction(async (tx) => {
    const config = await tx.queueConfig.findUnique({ where: { outletId } });
    if (!config) throw new Error('Antrian tidak ditemukan');

    await tx.queueConfig.update({
      where: { outletId },
      data: { currentNumber: 0, calledNumber: null },
    });

    // Archive semua tiket hari ini (jangan delete, biar ada history)
    return { message: 'Antrian berhasil direset' };
  });
}

// Ambil status antrian saat ini (untuk display screen dan customer)
export async function getQueueStatus(outletId: string) {
  const config = await prisma.queueConfig.findUnique({
    where: { outletId },
    include: {
      tickets: {
        where: { status: 'WAITING' },
        orderBy: { sequenceNumber: 'asc' },
        take: 5,
      },
    },
  });

  if (!config) return null;

  const waitingCount = await prisma.queueTicket.count({
    where: { queueConfigId: config.id, status: 'WAITING' },
  });

  return {
    prefix: config.prefix,
    currentNumber: config.currentNumber,
    calledNumber: config.calledNumber,
    isActive: config.isActive,
    waitingCount,
    nextTickets: config.tickets,
  };
}
```

---

#### Endpoint API Antrian

```
GET  /queue/:outletId/status    → status antrian saat ini (untuk display & customer)
POST /queue/:outletId/take      → customer ambil nomor antrian (public, tidak perlu login)
POST /queue/:outletId/call-next → staff panggil nomor berikutnya
POST /queue/tickets/:id/serve   → staff tandai sudah dilayani
POST /queue/tickets/:id/skip    → staff skip nomor ini
POST /queue/:outletId/reset     → reset antrian (hanya owner/admin)
GET  /queue/:outletId/config    → lihat konfigurasi antrian
PUT  /queue/:outletId/config    → update konfigurasi (prefix, isActive, dll)
```

---

### [4.3] Frontend Antrian

#### Halaman 1: Admin Config (`/dashboard/antrian/settings`)

```
Pengaturan Antrian — [Nama Outlet]

Prefix Nomor: [A] (bisa diubah ke B, C, dll)
Reset Harian: [ON / OFF toggle]
Status Antrian: [AKTIF / NONAKTIF toggle]

[Tombol: Simpan]
[Tombol: Reset Antrian Sekarang]
```

---

#### Halaman 2: Staff Panel (`/dashboard/antrian`)

```
Antrian — [Nama Outlet]

┌─────────────────────┐
│  Sedang Dilayani    │
│       A 012         │
│   (nomor besar)     │
└─────────────────────┘

Menunggu: 5 orang

[Tombol: PANGGIL BERIKUTNYA]

[Tombol: Sudah Dilayani]  [Tombol: Lewati]
```

---

#### Halaman 3: Display Screen (`/display/:outletId`)

Halaman ini **public** (tidak perlu login), diakses dari browser yang dipasang di TV/monitor customer.

```
┌─────────────────────────────────┐
│         ANTRIAN                 │
│                                 │
│    Nomor yang Dipanggil:        │
│                                 │
│            A 012                │
│         (font sangat besar)     │
│                                 │
│    Menunggu: 5 nomor            │
└─────────────────────────────────┘
```

Auto-refresh setiap 5 detik.

Route: `pos_web/src/app/display/[outletId]/page.tsx`

---

#### Halaman 4: Customer Ticket (`/antrian/:outletId`)

Halaman **public** untuk customer, bisa diakses via QR di meja/tempat duduk.

```
[Nama Outlet]

[Tombol besar: AMBIL NOMOR ANTRIAN]

Setelah klik:
┌──────────────────┐
│  Nomor Antrian   │
│    Kamu: A 013   │
│                  │
│ Sedang dilayani: │
│       A 012      │
│                  │
│ Posisimu: No. 1  │
└──────────────────┘
```

Route: `pos_web/src/app/antrian/[outletId]/page.tsx`

---

### [4.4] Antrian Terikat ke Feature Flag

**Tujuan:** Antrian hanya bisa dipakai kalau paket berlangganan support.

**Langkah:**

1. Tambah feature flag baru di database (via seed atau platform admin):
```
key: "QUEUE_BASIC"     → antrian basic (1 counter)
key: "QUEUE_ADVANCED"  → antrian multi-counter + statistik
```

2. Di route queue, tambah middleware cek feature flag:
```typescript
import { requireFeatureFlag } from '../../middlewares/require-feature-flag.middleware';

router.post('/:outletId/take', requireFeatureFlag('QUEUE_BASIC'), takeTicketHandler);
```

3. Di frontend, sembunyikan menu Antrian kalau feature flag tidak aktif:
```typescript
const hasQueue = currentUser?.featureFlags?.includes('QUEUE_BASIC');
if (!hasQueue) return null; // jangan tampilkan menu
```

---

## PHASE 5 — Health Vertical (Apotek)

**Tujuan:** Apotek bisa pakai platform dengan fitur expiry tracking dan antrian.  
**Estimasi:** 3-4 minggu  
**Prasyarat:** Phase 1 + Phase 4 selesai

---

### [5.1] Expiry & Batch Tracking

**Tujuan:** Produk di apotek bisa punya tanggal expired dan nomor batch.

**File yang diubah:** `pos_api/prisma/schema.prisma`

Tambah model:
```prisma
model ProductBatch {
  id            String    @id @default(cuid())
  businessId    String
  outletId      String
  productId     String
  batchNumber   String              // nomor batch dari supplier
  expiryDate    DateTime            // tanggal expired
  quantity      Int                 // jumlah stok di batch ini
  purchasePrice Decimal?            @db.Decimal(14, 2)
  receivedAt    DateTime            @default(now())
  createdAt     DateTime            @default(now())
  updatedAt     DateTime            @updatedAt

  business Business @relation(fields: [businessId], references: [id])
  outlet   Outlet   @relation(fields: [outletId], references: [id])
  product  Product  @relation(fields: [productId], references: [id])

  @@index([businessId, expiryDate])
  @@index([outletId, productId])
  @@map("product_batches")
}
```

Jalankan:
```bash
npx prisma migrate dev --name add_product_batch_model
npx prisma generate
```

---

### [5.2] Alert Expiry

**Tujuan:** Sistem otomatis deteksi produk yang akan expired.

**Langkah:**

1. Buat fungsi di service:
```typescript
// pos_api/src/modules/inventory/inventory.service.ts
export async function getExpiringProducts(businessId: string, daysAhead: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() + daysAhead);

  return prisma.productBatch.findMany({
    where: {
      businessId,
      expiryDate: { lte: cutoff },
      quantity: { gt: 0 },
    },
    include: { product: { select: { name: true } }, outlet: { select: { name: true } } },
    orderBy: { expiryDate: 'asc' },
  });
}
```

2. Endpoint baru:
```
GET /inventory/expiring?days=30   → produk yang expired dalam 30 hari ke depan
GET /inventory/expired            → produk yang sudah expired
```

3. Di dashboard Health, tampilkan card:
```
⚠️ Produk Mendekati Expired (30 hari): 5 produk
🔴 Produk Sudah Expired: 2 produk
```

---

## Sistem Paket & Feature Flag

### Mapping Paket → Feature Flag

```
Paket STARTER
├── max_outlets: 1
├── max_products: 200
├── max_users: 3
└── feature_flags: []  (tidak ada add-on)

Paket GROWTH
├── max_outlets: 3
├── max_products: unlimited
├── max_users: 10
└── feature_flags:
    ├── QUEUE_BASIC         ← antrian basic
    └── SUPPLIER_MODULE     ← purchase order & supplier

Paket PRO
├── max_outlets: unlimited
├── max_products: unlimited
├── max_users: unlimited
└── feature_flags:
    ├── QUEUE_BASIC
    ├── QUEUE_ADVANCED      ← multi-counter, statistik
    ├── SUPPLIER_MODULE
    ├── EXPIRY_TRACKING     ← batch & expiry
    ├── KITCHEN_DISPLAY     ← FNB only
    └── GUEST_MENU          ← FNB only, QR order
```

### Cara Tambah Feature Flag Baru

1. Tambahkan record ke tabel `feature_flags`:
```sql
INSERT INTO feature_flags (id, key, name, description, created_at, updated_at)
VALUES (gen_random_uuid(), 'QUEUE_BASIC', 'Antrian Basic', 'Modul antrian 1 counter', now(), now());
```

2. Mapping ke plan di tabel `plan_feature_flags`:
```sql
INSERT INTO plan_feature_flags (id, plan_id, feature_flag_id, created_at)
VALUES (gen_random_uuid(), '[PLAN_GROWTH_ID]', '[FEATURE_FLAG_QUEUE_BASIC_ID]', now());
```

3. Buat seed data di `pos_api/prisma/seed.ts` supaya bisa di-reset kapan saja.

---

## Checklist Demo per Vertical

### Demo Retail
- [ ] Login → langsung masuk Retail mode
- [ ] Menu sidebar: Products, Categories, Outlets, Suppliers, Purchase Order, Inventory, Reports
- [ ] Menu sidebar TIDAK ADA: Kitchen, Meja, Work Order
- [ ] POS kasir: tidak ada pilihan meja/dine-in
- [ ] Buat transaksi → muncul di laporan
- [ ] Stok berkurang setelah transaksi

### Demo F&B
- [ ] Login → langsung masuk F&B mode
- [ ] Menu sidebar: Products, Meja, Kitchen, Guest Menu, Reports
- [ ] POS kasir: ada pilihan meja dan dine-in/takeaway
- [ ] Buat order → muncul di kitchen display
- [ ] Kitchen update status → order selesai
- [ ] QR guest menu bisa diakses dari HP

### Demo Service (Bengkel)
- [ ] Login → langsung masuk Service mode
- [ ] Menu utama: Work Order, Antrian (kalau aktif)
- [ ] Buat WO baru: isi nama customer, HP, jenis kendaraan, keluhan
- [ ] Update status WO: RECEIVED → IN_PROGRESS → DONE
- [ ] Tambah item jasa dan spare part ke WO
- [ ] Antrian: ambil nomor → panggil → display screen update

### Demo Apotek
- [ ] Login → Retail mode dengan label "Apotek"
- [ ] Dashboard: ada card "Mendekati Expired" dan "Sudah Expired"
- [ ] Input stok obat: ada field batch number dan expiry date
- [ ] Antrian aktif dan bisa diakses customer via QR
- [ ] POS kasir: tampil warning kalau obat hampir expired

---

## Catatan Penting untuk Developer

1. **Jangan hapus data lama** — selalu gunakan soft delete (tambah field `deletedAt`) atau ubah status, jangan hapus row dari database.

2. **Selalu validasi businessId** — setiap query ke database yang melibatkan data bisnis harus filter dengan `businessId` dari `req.businessAccess.businessId`, bukan dari request body atau params, untuk mencegah akses data bisnis lain.

3. **Prisma transaction** — kalau satu operasi butuh update beberapa tabel sekaligus (contoh: update stok + buat log), gunakan `prisma.$transaction()`.

4. **Error handling** — gunakan `throw new Error('pesan')` di service, biarkan framework menangkap via `express-async-errors` yang sudah terpasang.

5. **Response format** — selalu gunakan `successResponse()` dan `errorResponse()` dari `utils/api-response.ts`, jangan return JSON langsung.

6. **Urutan middleware di routes** — selalu ikuti urutan ini:
   ```
   authMiddleware → businessAccessMiddleware → requireBusinessType → requireBusinessPermission → validate → handler
   ```

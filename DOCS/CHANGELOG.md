# Changelog / Release Notes

Semua perubahan penting proyek akan dicatat di dokumen ini.

Format mengikuti prinsip Keep a Changelog dengan versi tanggal internal.

## [Unreleased]

- Belum ada catatan tambahan.

## [2026-04-08] - Phase 7 Reports + Phase 6 Inventory

### Added

- Modul inventory:
  - stock summary
  - movement history
  - stock in/out
  - stock adjustment
- Modul laporan:
  - sales summary
  - orders report
  - items report

### Changed

- Penambahan migration `20260408071839_fase6_inventory`.
- Penambahan migration `20260408_152953_phase7_reports`.

## [2026-04-02] - Promo Outlet Scope

### Added

- Dukungan promo scope:
  - all outlets
  - selected outlets

### Changed

- Migration `20260402015925_add_promo_outlet_scope`.

## [2026-03-30] - Phase 4 Transaction Core

### Added

- Core transaksi order, payment, receipt snapshot.

### Changed

- Migration `20260330065144_phase4_transaction_core_receipt_snapshot`.

## [2026-03-29] - Product Barcode

### Added

- Dukungan barcode pada product.

### Changed

- Migration `20260329130141_add_product_barcode`.

## [2026-03-28] - Phase 3 Master Data + Promo Basic

### Added

- Master data category, product, outlet-level product setting.
- Promo basic dan permission terkait promo/product attributes.

### Changed

- Migration:
  - `20260328042021_phase3_master_data`
  - `20260328083900_add_product_brand_unit_and_promo_permissions`
  - `20260328115443_add_promo_basic`

## [2026-03-27] - Initial Platform + Business Scope

### Added

- Inisialisasi schema utama platform POS.
- Scope business user + permission outlet.

### Changed

- Migration:
  - `20260327073315_init`
  - `20260327145702_phase_2_business_user_scope`
  - `20260327160513_add_outlet_permissions`

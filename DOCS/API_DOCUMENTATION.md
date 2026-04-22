# API Documentation

## Base URL

- Local: `http://localhost:4000/api`

## Response Format

Sukses:

```json
{
  "success": true,
  "message": "string",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "string",
  "errors": null
}
```

## Authentication

- Gunakan header: `Authorization: Bearer <access_token>`
- Endpoint protected akan return `401` jika token invalid/expired.

## Business Scope Header

Banyak endpoint memerlukan header:

- `x-business-id: <business_id>`

Header ini dipakai middleware `businessAccessMiddleware` untuk menentukan konteks bisnis aktif.

## Endpoint Groups

## Health

- `GET /health`

## Auth

- `POST /auth/login`
- `GET /auth/me`

## Platform (Super Admin)

- `GET /platform/business-types`
- `GET /platform/businesses`
- `POST /platform/businesses`
- `GET /platform/businesses/:id`
- `PUT /platform/businesses/:id`
- `PATCH /platform/businesses/:id/status`
- `GET /platform/outlets`
- `POST /platform/outlets`
- `GET /platform/outlets/:id`
- `PUT /platform/outlets/:id`
- `PATCH /platform/outlets/:id/status`
- `GET /platform/feature-flags`
- `GET /platform/businesses/:id/feature-flags`
- `PUT /platform/businesses/:id/feature-flags`

## Business Reference dan Management

- `GET /business/roles`
- `GET /business/permissions`
- `GET /business/feature-flags`
- `GET /business/users`
- `POST /business/users`
- `GET /business/users/:id`
- `PUT /business/users/:id`
- `PATCH /business/users/:id/status`
- `GET /business/users/:id/outlet-access`
- `PUT /business/users/:id/outlet-access`
- `GET /business-users` (alias route)
- `POST /business-users` (alias route)
- `GET /business-users/:id` (alias route)
- `PUT /business-users/:id` (alias route)
- `PATCH /business-users/:id/status` (alias route)
- `GET /business-users/:id/outlet-access` (alias route)
- `PUT /business-users/:id/outlet-access` (alias route)
- `GET /business/outlets`
- `POST /business/outlets`
- `GET /business/outlets/:id`
- `PUT /business/outlets/:id`
- `PATCH /business/outlets/:id/status`
- `GET /business/categories`
- `POST /business/categories`
- `GET /business/categories/:id`
- `PUT /business/categories/:id`
- `PATCH /business/categories/:id/status`
- `GET /business/products`
- `POST /business/products`
- `GET /business/products/:id`
- `PUT /business/products/:id`
- `PATCH /business/products/:id/status`
- `GET /business/product-outlet-settings`
- `GET /business/product-outlet-settings/products/:productId`
- `PUT /business/product-outlet-settings/products/:productId/outlets/:outletId`
- `GET /business/outlets-tables/:outletId/tables`
- `POST /business/outlets-tables/:outletId/tables`
- `GET /business/outlets-tables/:outletId/tables/:id`
- `PUT /business/outlets-tables/:outletId/tables/:id`
- `PATCH /business/outlets-tables/:outletId/tables/:id/status`

## Core POS

- `GET /products`
- `POST /products`
- `GET /products/:id`
- `PUT /products/:id`
- `PATCH /products/:id/status`
- `GET /promos/meta/form`
- `GET /promos`
- `POST /promos`
- `GET /promos/:id`
- `PUT /promos/:id`
- `PATCH /promos/:id/status`
- `GET /orders`
- `POST /orders`
- `GET /orders/:id`
- `POST /orders/:id/items`
- `PUT /orders/:id/items/:itemId`
- `PATCH /orders/:id/status`
- `GET /payments`
- `POST /payments`
- `GET /payments/:id`
- `GET /receipts/:id`
- `GET /receipts/order/:orderId`

## Inventory

- `GET /inventory/stock-summary`
- `GET /inventory/movements`
- `POST /inventory/movements/stock-in`
- `POST /inventory/movements/stock-out`
- `POST /inventory/adjustments`

## Reports

- `GET /reports/sales-summary`
- `GET /reports/orders`
- `GET /reports/items`

## POS Settings

- `GET /settings/pos-charges`
- `PUT /settings/pos-charges`

## Kitchen dan Restaurant Operations

- `GET /outlets/:outletId/kitchen/orders`
- `PATCH /kitchen/orders/:id/items/:itemId/status`
- `GET /outlets/:outletId/qr/tables/:tableId`
- `GET /outlets/:outletId/tables/monitor`

## Guest Public API

- `GET /outlets/:outletId/guest/menu?tableId=<id>&token=<token>`
- `POST /outlets/:outletId/guest/orders`

## Catatan Implementasi

- Route dimount di `app.use('/api', routes)`.
- Tidak semua endpoint punya contoh payload di dokumen ini; payload detail mengikuti schema validasi per module (`*.validation.ts`).

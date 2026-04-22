# ERD / Database Schema

Sumber utama: `pos_api/prisma/schema.prisma` (PostgreSQL + Prisma).

## Entity Relationship Diagram (Core)

```mermaid
erDiagram
  USER ||--o{ USER_PLATFORM_ROLE : has
  PLATFORM_ROLE ||--o{ USER_PLATFORM_ROLE : grants

  USER ||--o{ BUSINESS_USER : joins
  BUSINESS ||--o{ BUSINESS_USER : has
  BUSINESS_ROLE ||--o{ BUSINESS_USER : assigns

  BUSINESS_ROLE ||--o{ BUSINESS_ROLE_PERMISSION : has
  BUSINESS_PERMISSION ||--o{ BUSINESS_ROLE_PERMISSION : maps

  BUSINESS ||--o{ OUTLET : owns
  BUSINESS ||--o{ CATEGORY : owns
  BUSINESS ||--o{ PRODUCT : owns
  CATEGORY ||--o{ PRODUCT : classifies
  PRODUCT ||--o{ PRODUCT_OUTLET_SETTING : config
  OUTLET ||--o{ PRODUCT_OUTLET_SETTING : config

  OUTLET ||--o{ OUTLET_TABLE : has
  OUTLET_TABLE ||--o{ ORDER : serves

  BUSINESS ||--o{ ORDER : has
  OUTLET ||--o{ ORDER : has
  BUSINESS_USER ||--o{ ORDER : creates
  ORDER ||--o{ ORDER_ITEM : contains
  PRODUCT ||--o{ ORDER_ITEM : referenced

  ORDER ||--o{ PAYMENT : paid_by
  BUSINESS ||--o{ PAYMENT : has
  OUTLET ||--o{ PAYMENT : has
  BUSINESS_USER ||--o{ PAYMENT : receives

  ORDER ||--o| RECEIPT : has
  PAYMENT ||--o| RECEIPT : links
  BUSINESS ||--o{ RECEIPT : has
  OUTLET ||--o{ RECEIPT : has

  BUSINESS ||--o{ PROMO : has
  CATEGORY ||--o{ PROMO : target
  PRODUCT ||--o{ PROMO : target
  PROMO ||--o{ PROMO_OUTLET : scoped_to
  OUTLET ||--o{ PROMO_OUTLET : scoped_to

  BUSINESS ||--o{ INVENTORY_ITEM : has
  OUTLET ||--o{ INVENTORY_ITEM : has
  PRODUCT ||--o{ INVENTORY_ITEM : stock

  INVENTORY_ITEM ||--o{ INVENTORY_MOVEMENT : records
  BUSINESS ||--o{ INVENTORY_MOVEMENT : has
  OUTLET ||--o{ INVENTORY_MOVEMENT : has
  PRODUCT ||--o{ INVENTORY_MOVEMENT : affects
```

## Model Inti

- Identity & akses: `User`, `PlatformRole`, `UserPlatformRole`, `BusinessUser`, `BusinessRole`, `BusinessPermission`.
- Organisasi: `Business`, `Outlet`, `BusinessFeatureFlag`.
- Master data: `Category`, `Product`, `ProductOutletSetting`, `OutletTable`.
- Transaksi: `Order`, `OrderItem`, `Payment`, `Receipt`.
- Promo: `Promo`, `PromoOutlet`.
- Inventory: `InventoryItem`, `InventoryMovement`.
- POS config: `OutletPosChargeRule`, `OutletRoundingSetting`.

## Enum Penting

- Status: `UserStatus`, `BusinessStatus`, `OutletStatus`, `OrderStatus`, `PaymentStatus`, dll.
- Akses: `PlatformRoleCode`, `BusinessRoleCode`, `BusinessPermissionCode`.
- Promo: `PromoTargetType`, `PromoDiscountType`, `PromoOutletScope`.
- Inventory: `InventoryMovementType`.

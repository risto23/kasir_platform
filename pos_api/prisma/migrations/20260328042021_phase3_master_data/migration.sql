-- CreateEnum
CREATE TYPE "CategoryStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ProductOutletStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "OutletTableStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BusinessPermissionCode" ADD VALUE 'CATEGORY_VIEW';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'CATEGORY_CREATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'CATEGORY_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'CATEGORY_STATUS_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PRODUCT_VIEW';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PRODUCT_CREATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PRODUCT_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PRODUCT_STATUS_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PRODUCT_OUTLET_VIEW';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PRODUCT_OUTLET_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'OUTLET_TABLE_VIEW';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'OUTLET_TABLE_CREATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'OUTLET_TABLE_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'OUTLET_TABLE_STATUS_UPDATE';

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "CategoryStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "categoryId" TEXT,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "sku" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "basePrice" DECIMAL(14,2) NOT NULL,
    "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_outlet_settings" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "status" "ProductOutletStatus" NOT NULL DEFAULT 'ACTIVE',
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "priceOverride" DECIMAL(14,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_outlet_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_tables" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "capacity" INTEGER,
    "status" "OutletTableStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_tables_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "categories_businessId_status_idx" ON "categories"("businessId", "status");

-- CreateIndex
CREATE INDEX "categories_businessId_sortOrder_idx" ON "categories"("businessId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "categories_businessId_name_key" ON "categories"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_businessId_code_key" ON "categories"("businessId", "code");

-- CreateIndex
CREATE INDEX "products_businessId_status_idx" ON "products"("businessId", "status");

-- CreateIndex
CREATE INDEX "products_businessId_categoryId_idx" ON "products"("businessId", "categoryId");

-- CreateIndex
CREATE INDEX "products_businessId_name_idx" ON "products"("businessId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "products_businessId_code_key" ON "products"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "products_businessId_sku_key" ON "products"("businessId", "sku");

-- CreateIndex
CREATE INDEX "product_outlet_settings_outletId_status_idx" ON "product_outlet_settings"("outletId", "status");

-- CreateIndex
CREATE INDEX "product_outlet_settings_productId_status_idx" ON "product_outlet_settings"("productId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "product_outlet_settings_productId_outletId_key" ON "product_outlet_settings"("productId", "outletId");

-- CreateIndex
CREATE INDEX "outlet_tables_outletId_status_idx" ON "outlet_tables"("outletId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_tables_outletId_code_key" ON "outlet_tables"("outletId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_tables_outletId_name_key" ON "outlet_tables"("outletId", "name");

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_outlet_settings" ADD CONSTRAINT "product_outlet_settings_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_outlet_settings" ADD CONSTRAINT "product_outlet_settings_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_tables" ADD CONSTRAINT "outlet_tables_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

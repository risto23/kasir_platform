-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PROMO_VIEW';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PROMO_CREATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PROMO_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'PROMO_STATUS_UPDATE';

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "brand" TEXT,
ADD COLUMN     "unit" TEXT;

-- CreateIndex
CREATE INDEX "products_businessId_brand_idx" ON "products"("businessId", "brand");

-- CreateIndex
CREATE INDEX "products_businessId_unit_idx" ON "products"("businessId", "unit");

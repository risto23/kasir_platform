/*
  Warnings:

  - A unique constraint covering the columns `[businessId,name]` on the table `products` will be added. If there are existing duplicate values, this will fail.
  - Made the column `code` on table `categories` required. This step will fail if there are existing NULL values in that column.
  - Made the column `code` on table `products` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "PromoOutletScope" AS ENUM ('ALL_OUTLETS', 'SELECTED_OUTLETS');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "categories" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "code" SET NOT NULL;

-- AlterTable
ALTER TABLE "promos" ADD COLUMN     "outletScope" "PromoOutletScope" NOT NULL DEFAULT 'ALL_OUTLETS';

-- CreateTable
CREATE TABLE "promo_outlets" (
    "id" TEXT NOT NULL,
    "promoId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promo_outlets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promo_outlets_promoId_idx" ON "promo_outlets"("promoId");

-- CreateIndex
CREATE INDEX "promo_outlets_outletId_idx" ON "promo_outlets"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "promo_outlets_promoId_outletId_key" ON "promo_outlets"("promoId", "outletId");

-- CreateIndex
CREATE INDEX "business_feature_flags_featureFlagId_idx" ON "business_feature_flags"("featureFlagId");

-- CreateIndex
CREATE UNIQUE INDEX "products_businessId_name_key" ON "products"("businessId", "name");

-- CreateIndex
CREATE INDEX "promos_businessId_outletScope_idx" ON "promos"("businessId", "outletScope");

-- CreateIndex
CREATE INDEX "user_platform_roles_platformRoleId_idx" ON "user_platform_roles"("platformRoleId");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- AddForeignKey
ALTER TABLE "promo_outlets" ADD CONSTRAINT "promo_outlets_promoId_fkey" FOREIGN KEY ("promoId") REFERENCES "promos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promo_outlets" ADD CONSTRAINT "promo_outlets_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

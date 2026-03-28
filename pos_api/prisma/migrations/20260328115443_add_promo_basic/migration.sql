-- CreateEnum
CREATE TYPE "PromoStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PromoTargetType" AS ENUM ('CATEGORY', 'PRODUCT', 'PRODUCT_NAME', 'BRAND', 'UNIT');

-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateTable
CREATE TABLE "promos" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "targetType" "PromoTargetType" NOT NULL,
    "categoryId" TEXT,
    "productId" TEXT,
    "targetTextValue" TEXT,
    "discountType" "PromoDiscountType" NOT NULL,
    "discountValue" DECIMAL(14,2) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "status" "PromoStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promos_businessId_status_idx" ON "promos"("businessId", "status");

-- CreateIndex
CREATE INDEX "promos_businessId_targetType_idx" ON "promos"("businessId", "targetType");

-- CreateIndex
CREATE INDEX "promos_businessId_startDate_endDate_idx" ON "promos"("businessId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "promos_categoryId_idx" ON "promos"("categoryId");

-- CreateIndex
CREATE INDEX "promos_productId_idx" ON "promos"("productId");

-- AddForeignKey
ALTER TABLE "promos" ADD CONSTRAINT "promos_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promos" ADD CONSTRAINT "promos_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promos" ADD CONSTRAINT "promos_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

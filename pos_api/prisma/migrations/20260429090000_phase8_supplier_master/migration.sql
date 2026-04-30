-- CreateEnum
CREATE TYPE "SupplierStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- AlterEnum
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'SUPPLIER_VIEW';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'SUPPLIER_CREATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'SUPPLIER_UPDATE';
ALTER TYPE "BusinessPermissionCode" ADD VALUE 'SUPPLIER_STATUS_UPDATE';

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SupplierStatus" NOT NULL DEFAULT 'ACTIVE',
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "paymentTermDays" INTEGER,
    "taxNumber" TEXT,
    "notes" TEXT,
    "leadTimeDays" INTEGER,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,
    "lastOrderAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_businessId_code_key" ON "suppliers"("businessId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_businessId_name_key" ON "suppliers"("businessId", "name");

-- CreateIndex
CREATE INDEX "suppliers_businessId_status_idx" ON "suppliers"("businessId", "status");

-- CreateIndex
CREATE INDEX "suppliers_businessId_isPreferred_idx" ON "suppliers"("businessId", "isPreferred");

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

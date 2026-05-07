-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "PosChargeType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (idempotent)
DO $$ BEGIN
    CREATE TYPE "RoundingMethod" AS ENUM ('NONE', 'NEAREST', 'CEIL', 'FLOOR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- DropIndex
DROP INDEX "plans_name_key";

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "customerName" TEXT;

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "surchargeAmount" DECIMAL(14,2),
DROP COLUMN "method",
ADD COLUMN     "method" TEXT NOT NULL DEFAULT 'CASH';

-- CreateTable
CREATE TABLE "outlet_payment_methods" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "surchargeRules" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_pos_charge_rules" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "PosChargeType" NOT NULL,
    "value" DECIMAL(14,2) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_pos_charge_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_rounding_settings" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "method" "RoundingMethod" NOT NULL DEFAULT 'CEIL',
    "unit" INTEGER NOT NULL DEFAULT 100,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_rounding_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_receipt_settings" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "brandName" TEXT,
    "logoUrl" TEXT,
    "headerText" TEXT,
    "footerText" TEXT,
    "showBusinessName" BOOLEAN NOT NULL DEFAULT true,
    "showOutletName" BOOLEAN NOT NULL DEFAULT true,
    "showOutletAddress" BOOLEAN NOT NULL DEFAULT true,
    "showOutletPhone" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outlet_receipt_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_settings" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supportEmail" TEXT,
    "supportPhone" TEXT,
    "websiteUrl" TEXT,
    "address" TEXT,
    "tagline" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outlet_settings" (
    "id" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "contactEmail" TEXT,
    "whatsappNumber" TEXT,
    "mapsUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "guestQrEnabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "outlet_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT,
    "actorUserId" TEXT,
    "actorBusinessUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "entityLabel" TEXT,
    "summary" TEXT,
    "changes" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "outlet_payment_methods_outletId_isActive_idx" ON "outlet_payment_methods"("outletId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_payment_methods_outletId_code_key" ON "outlet_payment_methods"("outletId", "code");

-- CreateIndex
CREATE INDEX "outlet_pos_charge_rules_businessId_outletId_idx" ON "outlet_pos_charge_rules"("businessId", "outletId");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_pos_charge_rules_outletId_key_key" ON "outlet_pos_charge_rules"("outletId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_rounding_settings_outletId_key" ON "outlet_rounding_settings"("outletId");

-- CreateIndex
CREATE INDEX "outlet_rounding_settings_outletId_idx" ON "outlet_rounding_settings"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_receipt_settings_outletId_key" ON "outlet_receipt_settings"("outletId");

-- CreateIndex
CREATE INDEX "outlet_receipt_settings_outletId_idx" ON "outlet_receipt_settings"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "business_settings_businessId_key" ON "business_settings"("businessId");

-- CreateIndex
CREATE INDEX "business_settings_businessId_idx" ON "business_settings"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "outlet_settings_outletId_key" ON "outlet_settings"("outletId");

-- CreateIndex
CREATE INDEX "outlet_settings_outletId_idx" ON "outlet_settings"("outletId");

-- CreateIndex
CREATE INDEX "audit_logs_businessId_createdAt_idx" ON "audit_logs"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_outletId_createdAt_idx" ON "audit_logs"("outletId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_createdAt_idx" ON "audit_logs"("entityType", "createdAt");

-- AddForeignKey
ALTER TABLE "outlet_payment_methods" ADD CONSTRAINT "outlet_payment_methods_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_payment_methods" ADD CONSTRAINT "outlet_payment_methods_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_pos_charge_rules" ADD CONSTRAINT "outlet_pos_charge_rules_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_pos_charge_rules" ADD CONSTRAINT "outlet_pos_charge_rules_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_rounding_settings" ADD CONSTRAINT "outlet_rounding_settings_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_receipt_settings" ADD CONSTRAINT "outlet_receipt_settings_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_settings" ADD CONSTRAINT "business_settings_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outlet_settings" ADD CONSTRAINT "outlet_settings_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorBusinessUserId_fkey" FOREIGN KEY ("actorBusinessUserId") REFERENCES "business_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

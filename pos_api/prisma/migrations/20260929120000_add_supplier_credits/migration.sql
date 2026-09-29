-- CreateEnum
CREATE TYPE "SupplierCreditStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "SupplierCreditSource" AS ENUM ('PURCHASE_RETURN_OVERPAYMENT');

-- CreateEnum
CREATE TYPE "SupplierCreditUsageType" AS ENUM ('APPLY_TO_INVOICE', 'REFUND');

-- CreateTable
CREATE TABLE "supplier_credits" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceSupplierInvoiceId" TEXT,
    "purchaseReturnId" TEXT,
    "createdByBusinessUserId" TEXT NOT NULL,
    "creditNumber" TEXT NOT NULL,
    "sourceType" "SupplierCreditSource" NOT NULL,
    "status" "SupplierCreditStatus" NOT NULL DEFAULT 'OPEN',
    "amount" DECIMAL(14,2) NOT NULL,
    "usedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "remainingAmount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_credits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_credit_usages" (
    "id" TEXT NOT NULL,
    "supplierCreditId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT,
    "createdByBusinessUserId" TEXT NOT NULL,
    "usageNumber" TEXT NOT NULL,
    "type" "SupplierCreditUsageType" NOT NULL,
    "method" "PaymentMethod",
    "amount" DECIMAL(14,2) NOT NULL,
    "usageDate" TIMESTAMP(3) NOT NULL,
    "referenceNumber" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_credit_usages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "supplier_credits_creditNumber_key" ON "supplier_credits"("creditNumber");

-- CreateIndex
CREATE INDEX "supplier_credits_businessId_outletId_supplierId_status_idx" ON "supplier_credits"("businessId", "outletId", "supplierId", "status");

-- CreateIndex
CREATE INDEX "supplier_credits_sourceSupplierInvoiceId_idx" ON "supplier_credits"("sourceSupplierInvoiceId");

-- CreateIndex
CREATE INDEX "supplier_credits_purchaseReturnId_idx" ON "supplier_credits"("purchaseReturnId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_credit_usages_usageNumber_key" ON "supplier_credit_usages"("usageNumber");

-- CreateIndex
CREATE INDEX "supplier_credit_usages_supplierCreditId_idx" ON "supplier_credit_usages"("supplierCreditId");

-- CreateIndex
CREATE INDEX "supplier_credit_usages_supplierInvoiceId_idx" ON "supplier_credit_usages"("supplierInvoiceId");

-- CreateIndex
CREATE INDEX "supplier_credit_usages_businessId_outletId_usageDate_idx" ON "supplier_credit_usages"("businessId", "outletId", "usageDate");

-- AddForeignKey
ALTER TABLE "supplier_credits" ADD CONSTRAINT "supplier_credits_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credits" ADD CONSTRAINT "supplier_credits_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credits" ADD CONSTRAINT "supplier_credits_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credits" ADD CONSTRAINT "supplier_credits_sourceSupplierInvoiceId_fkey" FOREIGN KEY ("sourceSupplierInvoiceId") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credits" ADD CONSTRAINT "supplier_credits_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "purchase_returns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credit_usages" ADD CONSTRAINT "supplier_credit_usages_supplierCreditId_fkey" FOREIGN KEY ("supplierCreditId") REFERENCES "supplier_credits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credit_usages" ADD CONSTRAINT "supplier_credit_usages_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credit_usages" ADD CONSTRAINT "supplier_credit_usages_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credit_usages" ADD CONSTRAINT "supplier_credit_usages_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credit_usages" ADD CONSTRAINT "supplier_credit_usages_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;


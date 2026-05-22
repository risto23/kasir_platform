-- AlterTable
ALTER TABLE "payments" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "receipts" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "payments_deletedAt_idx" ON "payments"("deletedAt");

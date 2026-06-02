-- AlterTable: add optional minimum purchase amount to promos
ALTER TABLE "promos" ADD COLUMN "minChargeAmount" DECIMAL(14,2);

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('QUICK_SERVICE', 'DINE_IN');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "orderType" "OrderType" NOT NULL DEFAULT 'QUICK_SERVICE';

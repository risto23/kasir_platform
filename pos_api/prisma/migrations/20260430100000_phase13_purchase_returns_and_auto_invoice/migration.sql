CREATE TYPE "PurchaseReturnStatus" AS ENUM ('DRAFT', 'POSTED', 'VOID');

ALTER TABLE "goods_receipt_items"
ADD COLUMN "quantityReturned" DECIMAL(14,3) NOT NULL DEFAULT 0;

DROP INDEX IF EXISTS "supplier_invoices_goodsReceiptId_idx";
CREATE UNIQUE INDEX "supplier_invoices_goodsReceiptId_key" ON "supplier_invoices"("goodsReceiptId");

CREATE TABLE "purchase_returns" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "supplierInvoiceId" TEXT,
    "createdByBusinessUserId" TEXT NOT NULL,
    "postedByBusinessUserId" TEXT,
    "returnNumber" TEXT NOT NULL,
    "returnDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "status" "PurchaseReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_returns_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "purchase_return_items" (
    "id" TEXT NOT NULL,
    "purchaseReturnId" TEXT NOT NULL,
    "goodsReceiptItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "productCode" TEXT,
    "productSku" TEXT,
    "productBarcode" TEXT,
    "unit" TEXT,
    "quantityReturned" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "lineSubtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_return_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_returns_returnNumber_key" ON "purchase_returns"("returnNumber");
CREATE INDEX "purchase_returns_businessId_outletId_status_idx" ON "purchase_returns"("businessId", "outletId", "status");
CREATE INDEX "purchase_returns_businessId_supplierId_idx" ON "purchase_returns"("businessId", "supplierId");
CREATE INDEX "purchase_returns_goodsReceiptId_idx" ON "purchase_returns"("goodsReceiptId");
CREATE INDEX "purchase_returns_supplierInvoiceId_idx" ON "purchase_returns"("supplierInvoiceId");
CREATE INDEX "purchase_returns_outletId_returnDate_idx" ON "purchase_returns"("outletId", "returnDate");

CREATE INDEX "purchase_return_items_purchaseReturnId_idx" ON "purchase_return_items"("purchaseReturnId");
CREATE INDEX "purchase_return_items_goodsReceiptItemId_idx" ON "purchase_return_items"("goodsReceiptItemId");
CREATE INDEX "purchase_return_items_productId_idx" ON "purchase_return_items"("productId");

ALTER TABLE "purchase_returns"
ADD CONSTRAINT "purchase_returns_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_returns"
ADD CONSTRAINT "purchase_returns_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_returns"
ADD CONSTRAINT "purchase_returns_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_returns"
ADD CONSTRAINT "purchase_returns_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_returns"
ADD CONSTRAINT "purchase_returns_supplierInvoiceId_fkey" FOREIGN KEY ("supplierInvoiceId") REFERENCES "supplier_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "purchase_return_items"
ADD CONSTRAINT "purchase_return_items_purchaseReturnId_fkey" FOREIGN KEY ("purchaseReturnId") REFERENCES "purchase_returns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "purchase_return_items"
ADD CONSTRAINT "purchase_return_items_goodsReceiptItemId_fkey" FOREIGN KEY ("goodsReceiptItemId") REFERENCES "goods_receipt_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "purchase_return_items"
ADD CONSTRAINT "purchase_return_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

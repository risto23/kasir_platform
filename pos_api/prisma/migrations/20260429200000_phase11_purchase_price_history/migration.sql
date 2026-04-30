CREATE TABLE "purchase_price_histories" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "goodsReceiptId" TEXT NOT NULL,
    "goodsReceiptItemId" TEXT NOT NULL,
    "purchaseOrderId" TEXT,
    "purchaseOrderItemId" TEXT,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unitCost" DECIMAL(14,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_price_histories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "purchase_price_histories_goodsReceiptItemId_key" ON "purchase_price_histories"("goodsReceiptItemId");
CREATE INDEX "purchase_price_histories_businessId_outletId_effectiveDate_idx" ON "purchase_price_histories"("businessId", "outletId", "effectiveDate");
CREATE INDEX "purchase_price_histories_businessId_productId_effectiveDate_idx" ON "purchase_price_histories"("businessId", "productId", "effectiveDate");
CREATE INDEX "purchase_price_histories_businessId_supplierId_effectiveDate_idx" ON "purchase_price_histories"("businessId", "supplierId", "effectiveDate");
CREATE INDEX "purchase_price_histories_goodsReceiptId_idx" ON "purchase_price_histories"("goodsReceiptId");
CREATE INDEX "purchase_price_histories_purchaseOrderId_idx" ON "purchase_price_histories"("purchaseOrderId");
CREATE INDEX "purchase_price_histories_purchaseOrderItemId_idx" ON "purchase_price_histories"("purchaseOrderItemId");

ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_goodsReceiptId_fkey" FOREIGN KEY ("goodsReceiptId") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_goodsReceiptItemId_fkey" FOREIGN KEY ("goodsReceiptItemId") REFERENCES "goods_receipt_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "purchase_price_histories" ADD CONSTRAINT "purchase_price_histories_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "purchase_order_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

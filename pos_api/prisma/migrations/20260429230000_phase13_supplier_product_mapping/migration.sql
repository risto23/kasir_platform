CREATE TABLE "supplier_products" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "supplierSku" TEXT,
    "lastPurchasePrice" DECIMAL(14,2),
    "minimumOrderQty" DECIMAL(14,3),
    "isPrimarySupplier" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_products_supplierId_productId_key" ON "supplier_products"("supplierId", "productId");
CREATE INDEX "supplier_products_businessId_supplierId_idx" ON "supplier_products"("businessId", "supplierId");
CREATE INDEX "supplier_products_businessId_productId_idx" ON "supplier_products"("businessId", "productId");
CREATE INDEX "supplier_products_productId_isPrimarySupplier_idx" ON "supplier_products"("productId", "isPrimarySupplier");

ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

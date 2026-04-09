-- Phase 7: Reports - add permission + reporting indexes
ALTER TYPE "BusinessPermissionCode" ADD VALUE IF NOT EXISTS 'REPORT_VIEW';

-- Helpful indexes for reporting queries (camelCase columns)
CREATE INDEX IF NOT EXISTS "orders_business_createdAt_idx" ON "orders" ("businessId", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_business_outlet_createdAt_idx" ON "orders" ("businessId", "outletId", "createdAt");
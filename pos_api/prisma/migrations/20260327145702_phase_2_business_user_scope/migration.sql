-- CreateEnum
CREATE TYPE "BusinessUserStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BusinessPermissionCode" AS ENUM ('BUSINESS_ROLE_VIEW', 'BUSINESS_PERMISSION_VIEW', 'BUSINESS_USER_VIEW', 'BUSINESS_USER_CREATE', 'BUSINESS_USER_UPDATE', 'BUSINESS_USER_STATUS_UPDATE', 'BUSINESS_USER_ASSIGN_OUTLET', 'OUTLET_SCOPE_VIEW');

-- AlterTable
ALTER TABLE "business_users" ADD COLUMN     "hasAllOutletAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "status" "BusinessUserStatus" NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE "business_permissions" (
    "id" TEXT NOT NULL,
    "code" "BusinessPermissionCode" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_role_permissions" (
    "id" TEXT NOT NULL,
    "businessRoleId" TEXT NOT NULL,
    "businessPermissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_user_outlet_accesses" (
    "id" TEXT NOT NULL,
    "businessUserId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "business_user_outlet_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_permissions_code_key" ON "business_permissions"("code");

-- CreateIndex
CREATE INDEX "business_role_permissions_businessPermissionId_idx" ON "business_role_permissions"("businessPermissionId");

-- CreateIndex
CREATE UNIQUE INDEX "business_role_permissions_businessRoleId_businessPermission_key" ON "business_role_permissions"("businessRoleId", "businessPermissionId");

-- CreateIndex
CREATE INDEX "business_user_outlet_accesses_outletId_idx" ON "business_user_outlet_accesses"("outletId");

-- CreateIndex
CREATE UNIQUE INDEX "business_user_outlet_accesses_businessUserId_outletId_key" ON "business_user_outlet_accesses"("businessUserId", "outletId");

-- CreateIndex
CREATE INDEX "business_users_businessId_status_idx" ON "business_users"("businessId", "status");

-- AddForeignKey
ALTER TABLE "business_role_permissions" ADD CONSTRAINT "business_role_permissions_businessRoleId_fkey" FOREIGN KEY ("businessRoleId") REFERENCES "business_roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_role_permissions" ADD CONSTRAINT "business_role_permissions_businessPermissionId_fkey" FOREIGN KEY ("businessPermissionId") REFERENCES "business_permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_user_outlet_accesses" ADD CONSTRAINT "business_user_outlet_accesses_businessUserId_fkey" FOREIGN KEY ("businessUserId") REFERENCES "business_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_user_outlet_accesses" ADD CONSTRAINT "business_user_outlet_accesses_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

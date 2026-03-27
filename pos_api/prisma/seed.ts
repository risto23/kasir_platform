import { PrismaClient, PlatformRoleCode, BusinessRoleCode, BusinessType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Platform roles
  const superAdminRole = await prisma.platformRole.upsert({
    where: { code: PlatformRoleCode.SUPER_ADMIN },
    update: {},
    create: {
      code: PlatformRoleCode.SUPER_ADMIN,
      name: 'Super Admin',
      description: 'Platform developer / administrator',
    },
  });

  // Business roles
  const ownerRole = await prisma.businessRole.upsert({
    where: { code: BusinessRoleCode.OWNER },
    update: {},
    create: {
      code: BusinessRoleCode.OWNER,
      name: 'Owner',
      description: 'Pemilik bisnis',
    },
  });

  const adminRole = await prisma.businessRole.upsert({
    where: { code: BusinessRoleCode.ADMIN },
    update: {},
    create: {
      code: BusinessRoleCode.ADMIN,
      name: 'Admin',
      description: 'Admin bisnis',
    },
  });

  const cashierRole = await prisma.businessRole.upsert({
    where: { code: BusinessRoleCode.CASHIER },
    update: {},
    create: {
      code: BusinessRoleCode.CASHIER,
      name: 'Cashier',
      description: 'Kasir',
    },
  });

  const kitchenRole = await prisma.businessRole.upsert({
    where: { code: BusinessRoleCode.KITCHEN },
    update: {},
    create: {
      code: BusinessRoleCode.KITCHEN,
      name: 'Kitchen',
      description: 'Dapur',
    },
  });

  const inventoryRole = await prisma.businessRole.upsert({
    where: { code: BusinessRoleCode.INVENTORY },
    update: {},
    create: {
      code: BusinessRoleCode.INVENTORY,
      name: 'Inventory',
      description: 'Inventory',
    },
  });

  // Feature flags
  const featureBusinessManagement = await prisma.featureFlag.upsert({
    where: { key: 'BUSINESS_MANAGEMENT' },
    update: {},
    create: {
      key: 'BUSINESS_MANAGEMENT',
      name: 'Business Management',
      description: 'Kelola business',
    },
  });

  const featureOutletManagement = await prisma.featureFlag.upsert({
    where: { key: 'OUTLET_MANAGEMENT' },
    update: {},
    create: {
      key: 'OUTLET_MANAGEMENT',
      name: 'Outlet Management',
      description: 'Kelola outlet',
    },
  });

  const featureBasicDashboard = await prisma.featureFlag.upsert({
    where: { key: 'BASIC_DASHBOARD' },
    update: {},
    create: {
      key: 'BASIC_DASHBOARD',
      name: 'Basic Dashboard',
      description: 'Dashboard dasar',
    },
  });

  // Super admin user
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@pos.local' },
    update: {},
    create: {
      fullName: 'Platform Super Admin',
      email: 'superadmin@pos.local',
      passwordHash,
    },
  });

  await prisma.userPlatformRole.upsert({
    where: {
      userId_platformRoleId: {
        userId: superAdmin.id,
        platformRoleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdmin.id,
      platformRoleId: superAdminRole.id,
    },
  });

  // Owner user
  const ownerUser = await prisma.user.upsert({
    where: { email: 'owner@demo.local' },
    update: {},
    create: {
      fullName: 'Demo Business Owner',
      email: 'owner@demo.local',
      passwordHash,
    },
  });

  // Demo business
  const business = await prisma.business.upsert({
    where: { slug: 'demo-retail' },
    update: {},
    create: {
      name: 'Demo Retail Store',
      slug: 'demo-retail',
      businessType: BusinessType.RETAIL,
      ownerUserId: ownerUser.id,
    },
  });

  // Business memberships
  await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: ownerUser.id,
      },
    },
    update: {},
    create: {
      businessId: business.id,
      userId: ownerUser.id,
      businessRoleId: ownerRole.id,
      isPrimary: true,
    },
  });

  // Demo outlets
  await prisma.outlet.upsert({
    where: {
      businessId_code: {
        businessId: business.id,
        code: 'OUTLET-01',
      },
    },
    update: {},
    create: {
      businessId: business.id,
      name: 'Demo Outlet Utama',
      code: 'OUTLET-01',
      address: 'Jl. Contoh No. 1',
      phone: '081234567890',
    },
  });

  await prisma.outlet.upsert({
    where: {
      businessId_code: {
        businessId: business.id,
        code: 'OUTLET-02',
      },
    },
    update: {},
    create: {
      businessId: business.id,
      name: 'Demo Outlet Kedua',
      code: 'OUTLET-02',
      address: 'Jl. Contoh No. 2',
      phone: '081234567891',
    },
  });

  // Enable feature flags for business
  for (const feature of [
    featureBusinessManagement,
    featureOutletManagement,
    featureBasicDashboard,
  ]) {
    await prisma.businessFeatureFlag.upsert({
      where: {
        businessId_featureFlagId: {
          businessId: business.id,
          featureFlagId: feature.id,
        },
      },
      update: { enabled: true },
      create: {
        businessId: business.id,
        featureFlagId: feature.id,
        enabled: true,
      },
    });
  }

  console.log('Seed completed.');
  console.log({
    superAdmin: {
      email: 'superadmin@pos.local',
      password: 'password123',
    },
    ownerUser: {
      email: 'owner@demo.local',
      password: 'password123',
    },
    roles: {
      ownerRoleId: ownerRole.id,
      adminRoleId: adminRole.id,
      cashierRoleId: cashierRole.id,
      kitchenRoleId: kitchenRole.id,
      inventoryRoleId: inventoryRole.id,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
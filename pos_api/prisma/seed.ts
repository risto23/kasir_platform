import {
  PrismaClient,
  PlatformRoleCode,
  BusinessRoleCode,
  BusinessType,
  BusinessPermissionCode,
  BusinessUserStatus,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function upsertBusinessPermission(
  code: BusinessPermissionCode,
  name: string,
  description: string,
) {
  return prisma.businessPermission.upsert({
    where: { code },
    update: {
      name,
      description,
    },
    create: {
      code,
      name,
      description,
    },
  });
}

async function assignRolePermissions(
  businessRoleId: string,
  permissionIds: string[],
) {
  for (const permissionId of permissionIds) {
    await prisma.businessRolePermission.upsert({
      where: {
        businessRoleId_businessPermissionId: {
          businessRoleId,
          businessPermissionId: permissionId,
        },
      },
      update: {},
      create: {
        businessRoleId,
        businessPermissionId: permissionId,
      },
    });
  }
}

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

  // Business permissions
  const permissionBusinessRoleView = await upsertBusinessPermission(
    BusinessPermissionCode.BUSINESS_ROLE_VIEW,
    'Business Role View',
    'Melihat daftar role bisnis',
  );

  const permissionBusinessPermissionView = await upsertBusinessPermission(
    BusinessPermissionCode.BUSINESS_PERMISSION_VIEW,
    'Business Permission View',
    'Melihat daftar permission bisnis',
  );

  const permissionBusinessUserView = await upsertBusinessPermission(
    BusinessPermissionCode.BUSINESS_USER_VIEW,
    'Business User View',
    'Melihat daftar user bisnis',
  );

  const permissionBusinessUserCreate = await upsertBusinessPermission(
    BusinessPermissionCode.BUSINESS_USER_CREATE,
    'Business User Create',
    'Membuat user bisnis',
  );

  const permissionBusinessUserUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.BUSINESS_USER_UPDATE,
    'Business User Update',
    'Mengubah data user bisnis',
  );

  const permissionBusinessUserStatusUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.BUSINESS_USER_STATUS_UPDATE,
    'Business User Status Update',
    'Mengubah status user bisnis',
  );

  const permissionBusinessUserAssignOutlet = await upsertBusinessPermission(
    BusinessPermissionCode.BUSINESS_USER_ASSIGN_OUTLET,
    'Business User Assign Outlet',
    'Mengatur outlet access user bisnis',
  );

  const permissionOutletScopeView = await upsertBusinessPermission(
    BusinessPermissionCode.OUTLET_SCOPE_VIEW,
    'Outlet Scope View',
    'Melihat outlet yang menjadi scope akses user',
  );

  const permissionOutletView = await upsertBusinessPermission(
  BusinessPermissionCode.OUTLET_VIEW,
  'Outlet View',
  'Melihat daftar outlet',
);

const permissionOutletCreate = await upsertBusinessPermission(
  BusinessPermissionCode.OUTLET_CREATE,
  'Outlet Create',
  'Membuat outlet',
);

const permissionOutletUpdate = await upsertBusinessPermission(
  BusinessPermissionCode.OUTLET_UPDATE,
  'Outlet Update',
  'Mengubah data outlet',
);

const permissionOutletStatusUpdate = await upsertBusinessPermission(
  BusinessPermissionCode.OUTLET_STATUS_UPDATE,
  'Outlet Status Update',
  'Mengubah status outlet',
);

  // Role permission mapping
  const ownerPermissionIds = [
    permissionBusinessRoleView.id,
    permissionBusinessPermissionView.id,
    permissionBusinessUserView.id,
    permissionBusinessUserCreate.id,
    permissionBusinessUserUpdate.id,
    permissionBusinessUserStatusUpdate.id,
    permissionBusinessUserAssignOutlet.id,
    permissionOutletScopeView.id,
    permissionOutletView.id,
    permissionOutletCreate.id,
    permissionOutletUpdate.id,
    permissionOutletStatusUpdate.id,
  ];

  const adminPermissionIds = [
    permissionBusinessRoleView.id,
    permissionBusinessPermissionView.id,
    permissionBusinessUserView.id,
    permissionBusinessUserCreate.id,
    permissionBusinessUserUpdate.id,
    permissionBusinessUserStatusUpdate.id,
    permissionBusinessUserAssignOutlet.id,
    permissionOutletScopeView.id,
    permissionOutletView.id,
    permissionOutletCreate.id,
    permissionOutletUpdate.id,
    permissionOutletStatusUpdate.id,
  ];

  const cashierPermissionIds = [
    permissionOutletScopeView.id,
  ];

  const kitchenPermissionIds = [
    permissionOutletScopeView.id,
  ];

  const inventoryPermissionIds = [
    permissionOutletScopeView.id,
  ];

  await assignRolePermissions(ownerRole.id, ownerPermissionIds);
  await assignRolePermissions(adminRole.id, adminPermissionIds);
  await assignRolePermissions(cashierRole.id, cashierPermissionIds);
  await assignRolePermissions(kitchenRole.id, kitchenPermissionIds);
  await assignRolePermissions(inventoryRole.id, inventoryPermissionIds);

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

  // Additional business users
  const adminAllOutletUser = await prisma.user.upsert({
    where: { email: 'admin-all@demo.local' },
    update: {},
    create: {
      fullName: 'Demo Admin All Outlet',
      email: 'admin-all@demo.local',
      passwordHash,
    },
  });

  const adminLimitedUser = await prisma.user.upsert({
    where: { email: 'admin-limited@demo.local' },
    update: {},
    create: {
      fullName: 'Demo Admin Limited Outlet',
      email: 'admin-limited@demo.local',
      passwordHash,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: 'cashier@demo.local' },
    update: {},
    create: {
      fullName: 'Demo Cashier Outlet 1',
      email: 'cashier@demo.local',
      passwordHash,
    },
  });

  const kitchenUser = await prisma.user.upsert({
    where: { email: 'kitchen@demo.local' },
    update: {},
    create: {
      fullName: 'Demo Kitchen Outlet 1',
      email: 'kitchen@demo.local',
      passwordHash,
    },
  });

  const inventoryUser = await prisma.user.upsert({
    where: { email: 'inventory@demo.local' },
    update: {},
    create: {
      fullName: 'Demo Inventory Outlet 2',
      email: 'inventory@demo.local',
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

  // Demo outlets
  const outletOne = await prisma.outlet.upsert({
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

  const outletTwo = await prisma.outlet.upsert({
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

  // Business memberships
  const ownerBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: ownerUser.id,
      },
    },
    update: {
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
    create: {
      businessId: business.id,
      userId: ownerUser.id,
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
  });

  const superAdminBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: superAdmin.id,
      },
    },
    update: {
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
    create: {
      businessId: business.id,
      userId: superAdmin.id,
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
  });

  const adminAllOutletBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: adminAllOutletUser.id,
      },
    },
    update: {
      businessRoleId: adminRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: true,
    },
    create: {
      businessId: business.id,
      userId: adminAllOutletUser.id,
      businessRoleId: adminRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: true,
    },
  });

  const adminLimitedBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: adminLimitedUser.id,
      },
    },
    update: {
      businessRoleId: adminRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
    create: {
      businessId: business.id,
      userId: adminLimitedUser.id,
      businessRoleId: adminRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  const cashierBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: cashierUser.id,
      },
    },
    update: {
      businessRoleId: cashierRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
    create: {
      businessId: business.id,
      userId: cashierUser.id,
      businessRoleId: cashierRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  const kitchenBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: kitchenUser.id,
      },
    },
    update: {
      businessRoleId: kitchenRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
    create: {
      businessId: business.id,
      userId: kitchenUser.id,
      businessRoleId: kitchenRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  const inventoryBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: business.id,
        userId: inventoryUser.id,
      },
    },
    update: {
      businessRoleId: inventoryRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
    create: {
      businessId: business.id,
      userId: inventoryUser.id,
      businessRoleId: inventoryRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  // Outlet access assignments
  await prisma.businessUserOutletAccess.upsert({
    where: {
      businessUserId_outletId: {
        businessUserId: adminLimitedBusinessUser.id,
        outletId: outletOne.id,
      },
    },
    update: {},
    create: {
      businessUserId: adminLimitedBusinessUser.id,
      outletId: outletOne.id,
    },
  });

  await prisma.businessUserOutletAccess.upsert({
    where: {
      businessUserId_outletId: {
        businessUserId: cashierBusinessUser.id,
        outletId: outletOne.id,
      },
    },
    update: {},
    create: {
      businessUserId: cashierBusinessUser.id,
      outletId: outletOne.id,
    },
  });

  await prisma.businessUserOutletAccess.upsert({
    where: {
      businessUserId_outletId: {
        businessUserId: kitchenBusinessUser.id,
        outletId: outletOne.id,
      },
    },
    update: {},
    create: {
      businessUserId: kitchenBusinessUser.id,
      outletId: outletOne.id,
    },
  });

  await prisma.businessUserOutletAccess.upsert({
    where: {
      businessUserId_outletId: {
        businessUserId: inventoryBusinessUser.id,
        outletId: outletTwo.id,
      },
    },
    update: {},
    create: {
      businessUserId: inventoryBusinessUser.id,
      outletId: outletTwo.id,
    },
  });

  await prisma.businessUserOutletAccess.deleteMany({
    where: {
      businessUserId: superAdminBusinessUser.id,
    },
  });

  await prisma.businessUserOutletAccess.createMany({
    data: [
      {
        businessUserId: superAdminBusinessUser.id,
        outletId: outletOne.id,
      },
      {
        businessUserId: superAdminBusinessUser.id,
        outletId: outletTwo.id,
      },
    ],
    skipDuplicates: true,
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
    businessUsers: {
      adminAllOutlet: {
        email: 'admin-all@demo.local',
        password: 'password123',
      },
      adminLimited: {
        email: 'admin-limited@demo.local',
        password: 'password123',
      },
      cashier: {
        email: 'cashier@demo.local',
        password: 'password123',
      },
      kitchen: {
        email: 'kitchen@demo.local',
        password: 'password123',
      },
      inventory: {
        email: 'inventory@demo.local',
        password: 'password123',
      },
    },
    roles: {
      ownerRoleId: ownerRole.id,
      adminRoleId: adminRole.id,
      cashierRoleId: cashierRole.id,
      kitchenRoleId: kitchenRole.id,
      inventoryRoleId: inventoryRole.id,
    },
    permissions: {
      businessRoleView: permissionBusinessRoleView.code,
      businessPermissionView: permissionBusinessPermissionView.code,
      businessUserView: permissionBusinessUserView.code,
      businessUserCreate: permissionBusinessUserCreate.code,
      businessUserUpdate: permissionBusinessUserUpdate.code,
      businessUserStatusUpdate: permissionBusinessUserStatusUpdate.code,
      businessUserAssignOutlet: permissionBusinessUserAssignOutlet.code,
      outletScopeView: permissionOutletScopeView.code,
    },
    outletScopeExamples: {
      owner: 'all outlets',
      adminAllOutlet: 'all outlets',
      adminLimited: ['OUTLET-01'],
      cashier: ['OUTLET-01'],
      kitchen: ['OUTLET-01'],
      inventory: ['OUTLET-02'],
    },
    createdMemberships: {
      ownerBusinessUserId: ownerBusinessUser.id,
      adminAllOutletBusinessUserId: adminAllOutletBusinessUser.id,
      adminLimitedBusinessUserId: adminLimitedBusinessUser.id,
      cashierBusinessUserId: cashierBusinessUser.id,
      kitchenBusinessUserId: kitchenBusinessUser.id,
      inventoryBusinessUserId: inventoryBusinessUser.id,
    },
  });
}

main()
  .catch((error: unknown) => {
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error('Unknown seed error', error);
    }

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
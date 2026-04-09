import {
  PrismaClient,
  PlatformRoleCode,
  BusinessRoleCode,
  BusinessType,
  BusinessPermissionCode,
  BusinessUserStatus,
  CategoryStatus,
  ProductStatus,
  ProductOutletStatus,
  OutletTableStatus,
  PromoDiscountType,
  PromoOutletScope,
  PromoStatus,
  PromoTargetType,
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

async function enableFeatureFlag(
  businessId: string,
  key: string,
  name: string,
  description: string,
  enabled = true,
) {
  const featureFlag = await prisma.featureFlag.upsert({
    where: { key },
    update: {
      name,
      description,
    },
    create: {
      key,
      name,
      description,
    },
  });

  await prisma.businessFeatureFlag.upsert({
    where: {
      businessId_featureFlagId: {
        businessId,
        featureFlagId: featureFlag.id,
      },
    },
    update: {
      enabled,
    },
    create: {
      businessId,
      featureFlagId: featureFlag.id,
      enabled,
    },
  });

  return featureFlag;
}

type UpsertPromoInput = {
  businessId: string;
  name: string;
  description: string | null;
  targetType: PromoTargetType;
  categoryId: string | null;
  productId: string | null;
  targetTextValue: string | null;
  discountType: PromoDiscountType;
  discountValue: number;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  status: PromoStatus;
  outletScope: PromoOutletScope;
};

async function upsertPromoByBusinessAndName(input: UpsertPromoInput) {
  const existingPromo = await prisma.promo.findFirst({
    where: {
      businessId: input.businessId,
      name: input.name,
    },
    select: {
      id: true,
    },
  });

  if (existingPromo) {
    return prisma.promo.update({
      where: {
        id: existingPromo.id,
      },
      data: {
        description: input.description,
        targetType: input.targetType,
        categoryId: input.categoryId,
        productId: input.productId,
        targetTextValue: input.targetTextValue,
        discountType: input.discountType,
        discountValue: input.discountValue,
        startDate: input.startDate,
        endDate: input.endDate,
        startTime: input.startTime,
        endTime: input.endTime,
        status: input.status,
        outletScope: input.outletScope,
      },
    });
  }

  return prisma.promo.create({
    data: {
      businessId: input.businessId,
      name: input.name,
      description: input.description,
      targetType: input.targetType,
      categoryId: input.categoryId,
      productId: input.productId,
      targetTextValue: input.targetTextValue,
      discountType: input.discountType,
      discountValue: input.discountValue,
      startDate: input.startDate,
      endDate: input.endDate,
      startTime: input.startTime,
      endTime: input.endTime,
      status: input.status,
      outletScope: input.outletScope,
    },
  });
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  const superAdminRole = await prisma.platformRole.upsert({
    where: { code: PlatformRoleCode.SUPER_ADMIN },
    update: {},
    create: {
      code: PlatformRoleCode.SUPER_ADMIN,
      name: 'Super Admin',
      description: 'Platform developer / administrator',
    },
  });

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

  const permissionCategoryView = await upsertBusinessPermission(
    BusinessPermissionCode.CATEGORY_VIEW,
    'Category View',
    'Melihat daftar kategori',
  );

  const permissionCategoryCreate = await upsertBusinessPermission(
    BusinessPermissionCode.CATEGORY_CREATE,
    'Category Create',
    'Membuat kategori',
  );

  const permissionCategoryUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.CATEGORY_UPDATE,
    'Category Update',
    'Mengubah kategori',
  );

  const permissionCategoryStatusUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.CATEGORY_STATUS_UPDATE,
    'Category Status Update',
    'Mengubah status kategori',
  );

  const permissionProductView = await upsertBusinessPermission(
    BusinessPermissionCode.PRODUCT_VIEW,
    'Product View',
    'Melihat daftar product/menu',
  );

  const permissionProductCreate = await upsertBusinessPermission(
    BusinessPermissionCode.PRODUCT_CREATE,
    'Product Create',
    'Membuat product/menu',
  );

  const permissionProductUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.PRODUCT_UPDATE,
    'Product Update',
    'Mengubah product/menu',
  );

  const permissionProductStatusUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.PRODUCT_STATUS_UPDATE,
    'Product Status Update',
    'Mengubah status product/menu',
  );

  const permissionProductOutletView = await upsertBusinessPermission(
    BusinessPermissionCode.PRODUCT_OUTLET_VIEW,
    'Product Outlet View',
    'Melihat availability dan harga product per outlet',
  );

  const permissionProductOutletUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.PRODUCT_OUTLET_UPDATE,
    'Product Outlet Update',
    'Mengubah availability dan harga product per outlet',
  );

  const permissionPromoView = await upsertBusinessPermission(
    BusinessPermissionCode.PROMO_VIEW,
    'Promo View',
    'Melihat daftar promo',
  );

  const permissionPromoCreate = await upsertBusinessPermission(
    BusinessPermissionCode.PROMO_CREATE,
    'Promo Create',
    'Membuat promo',
  );

  const permissionPromoUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.PROMO_UPDATE,
    'Promo Update',
    'Mengubah promo',
  );

  const permissionPromoStatusUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.PROMO_STATUS_UPDATE,
    'Promo Status Update',
    'Mengubah status promo',
  );

  const permissionOutletTableView = await upsertBusinessPermission(
    BusinessPermissionCode.OUTLET_TABLE_VIEW,
    'Outlet Table View',
    'Melihat daftar meja outlet',
  );

  const permissionOutletTableCreate = await upsertBusinessPermission(
    BusinessPermissionCode.OUTLET_TABLE_CREATE,
    'Outlet Table Create',
    'Membuat meja outlet',
  );

  const permissionOutletTableUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.OUTLET_TABLE_UPDATE,
    'Outlet Table Update',
    'Mengubah meja outlet',
  );

  const permissionOutletTableStatusUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.OUTLET_TABLE_STATUS_UPDATE,
    'Outlet Table Status Update',
    'Mengubah status meja outlet',
  );

  const permissionOrderView = await upsertBusinessPermission(
    BusinessPermissionCode.ORDER_VIEW,
    'Order View',
    'Melihat daftar dan detail order transaksi',
  );

  const permissionOrderCreate = await upsertBusinessPermission(
    BusinessPermissionCode.ORDER_CREATE,
    'Order Create',
    'Membuat order transaksi',
  );

  const permissionOrderUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.ORDER_UPDATE,
    'Order Update',
    'Mengubah item, qty, note, dan data draft order',
  );

  const permissionOrderStatusUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.ORDER_STATUS_UPDATE,
    'Order Status Update',
    'Mengubah status order transaksi',
  );

  const permissionPaymentView = await upsertBusinessPermission(
    BusinessPermissionCode.PAYMENT_VIEW,
    'Payment View',
    'Melihat daftar dan detail pembayaran',
  );

  const permissionPaymentCreate = await upsertBusinessPermission(
    BusinessPermissionCode.PAYMENT_CREATE,
    'Payment Create',
    'Membuat pembayaran transaksi',
  );

  const permissionPaymentStatusUpdate = await upsertBusinessPermission(
    BusinessPermissionCode.PAYMENT_STATUS_UPDATE,
    'Payment Status Update',
    'Mengubah status pembayaran transaksi',
  );

  const permissionReceiptView = await upsertBusinessPermission(
    BusinessPermissionCode.RECEIPT_VIEW,
    'Receipt View',
    'Melihat dan mencetak struk transaksi',
  );

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
    permissionCategoryView.id,
    permissionCategoryCreate.id,
    permissionCategoryUpdate.id,
    permissionCategoryStatusUpdate.id,
    permissionProductView.id,
    permissionProductCreate.id,
    permissionProductUpdate.id,
    permissionProductStatusUpdate.id,
    permissionProductOutletView.id,
    permissionProductOutletUpdate.id,
    permissionPromoView.id,
    permissionPromoCreate.id,
    permissionPromoUpdate.id,
    permissionPromoStatusUpdate.id,
    permissionOrderView.id,
    permissionOrderCreate.id,
    permissionOrderUpdate.id,
    permissionOrderStatusUpdate.id,
    permissionPaymentView.id,
    permissionPaymentCreate.id,
    permissionPaymentStatusUpdate.id,
    permissionReceiptView.id,
    permissionOutletTableView.id,
    permissionOutletTableCreate.id,
    permissionOutletTableUpdate.id,
    permissionOutletTableStatusUpdate.id,
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
    permissionCategoryView.id,
    permissionCategoryCreate.id,
    permissionCategoryUpdate.id,
    permissionCategoryStatusUpdate.id,
    permissionProductView.id,
    permissionProductCreate.id,
    permissionProductUpdate.id,
    permissionProductStatusUpdate.id,
    permissionProductOutletView.id,
    permissionProductOutletUpdate.id,
    permissionPromoView.id,
    permissionPromoCreate.id,
    permissionPromoUpdate.id,
    permissionPromoStatusUpdate.id,
    permissionOrderView.id,
    permissionOrderCreate.id,
    permissionOrderUpdate.id,
    permissionOrderStatusUpdate.id,
    permissionPaymentView.id,
    permissionPaymentCreate.id,
    permissionPaymentStatusUpdate.id,
    permissionReceiptView.id,
    permissionOutletTableView.id,
    permissionOutletTableCreate.id,
    permissionOutletTableUpdate.id,
    permissionOutletTableStatusUpdate.id,
  ];

  const cashierPermissionIds = [
    permissionOutletScopeView.id,
    permissionCategoryView.id,
    permissionProductView.id,
    permissionProductOutletView.id,
    permissionPromoView.id,
    permissionOrderView.id,
    permissionOrderCreate.id,
    permissionOrderUpdate.id,
    permissionOrderStatusUpdate.id,
    permissionPaymentView.id,
    permissionPaymentCreate.id,
    permissionReceiptView.id,
    permissionOutletTableView.id,
  ];

  const kitchenPermissionIds = [
    permissionOutletScopeView.id,
    permissionProductView.id,
    permissionProductOutletView.id,
    permissionPromoView.id,
    permissionOutletTableView.id,
    permissionOrderView.id,
    permissionOrderUpdate.id,
  ];

  const inventoryPermissionIds = [
    permissionOutletScopeView.id,
    permissionCategoryView.id,
    permissionProductView.id,
    permissionProductOutletView.id,
    permissionPromoView.id,
  ];

  await assignRolePermissions(ownerRole.id, ownerPermissionIds);
  await assignRolePermissions(adminRole.id, adminPermissionIds);
  await assignRolePermissions(cashierRole.id, cashierPermissionIds);
  await assignRolePermissions(kitchenRole.id, kitchenPermissionIds);
  await assignRolePermissions(inventoryRole.id, inventoryPermissionIds);

  const superAdminRetail = await prisma.user.upsert({
    where: { email: 'superadmin-retail@pos.local' },
    update: {
      fullName: 'Super Admin Retail',
      passwordHash,
    },
    create: {
      fullName: 'Super Admin Retail',
      email: 'superadmin-retail@pos.local',
      passwordHash,
    },
  });

  const superAdminRestaurant = await prisma.user.upsert({
    where: { email: 'superadmin-resto@pos.local' },
    update: {
      fullName: 'Super Admin Restaurant',
      passwordHash,
    },
    create: {
      fullName: 'Super Admin Restaurant',
      email: 'superadmin-resto@pos.local',
      passwordHash,
    },
  });

  await prisma.userPlatformRole.upsert({
    where: {
      userId_platformRoleId: {
        userId: superAdminRetail.id,
        platformRoleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdminRetail.id,
      platformRoleId: superAdminRole.id,
    },
  });

  await prisma.userPlatformRole.upsert({
    where: {
      userId_platformRoleId: {
        userId: superAdminRestaurant.id,
        platformRoleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: superAdminRestaurant.id,
      platformRoleId: superAdminRole.id,
    },
  });

  const retailOwnerUser = await prisma.user.upsert({
    where: { email: 'owner@demo.local' },
    update: {
      fullName: 'Demo Retail Owner',
      passwordHash,
    },
    create: {
      fullName: 'Demo Retail Owner',
      email: 'owner@demo.local',
      passwordHash,
    },
  });

  const restaurantOwnerUser = await prisma.user.upsert({
    where: { email: 'owner-resto@demo.local' },
    update: {
      fullName: 'Demo Restaurant Owner',
      passwordHash,
    },
    create: {
      fullName: 'Demo Restaurant Owner',
      email: 'owner-resto@demo.local',
      passwordHash,
    },
  });

  const adminAllOutletUser = await prisma.user.upsert({
    where: { email: 'admin-all@demo.local' },
    update: {
      fullName: 'Demo Admin All Outlet',
      passwordHash,
    },
    create: {
      fullName: 'Demo Admin All Outlet',
      email: 'admin-all@demo.local',
      passwordHash,
    },
  });

  const adminLimitedUser = await prisma.user.upsert({
    where: { email: 'admin-limited@demo.local' },
    update: {
      fullName: 'Demo Admin Limited Outlet',
      passwordHash,
    },
    create: {
      fullName: 'Demo Admin Limited Outlet',
      email: 'admin-limited@demo.local',
      passwordHash,
    },
  });

  const cashierUser = await prisma.user.upsert({
    where: { email: 'cashier@demo.local' },
    update: {
      fullName: 'Demo Cashier Retail Outlet 1',
      passwordHash,
    },
    create: {
      fullName: 'Demo Cashier Retail Outlet 1',
      email: 'cashier@demo.local',
      passwordHash,
    },
  });

  const kitchenUser = await prisma.user.upsert({
    where: { email: 'kitchen@demo.local' },
    update: {
      fullName: 'Demo Kitchen Restaurant Outlet 1',
      passwordHash,
    },
    create: {
      fullName: 'Demo Kitchen Restaurant Outlet 1',
      email: 'kitchen@demo.local',
      passwordHash,
    },
  });

  const inventoryUser = await prisma.user.upsert({
    where: { email: 'inventory@demo.local' },
    update: {
      fullName: 'Demo Inventory Outlet 2',
      passwordHash,
    },
    create: {
      fullName: 'Demo Inventory Outlet 2',
      email: 'inventory@demo.local',
      passwordHash,
    },
  });

  const retailBusiness = await prisma.business.upsert({
    where: { slug: 'demo-retail' },
    update: {},
    create: {
      name: 'Demo Retail Store',
      slug: 'demo-retail',
      businessType: BusinessType.RETAIL,
      ownerUserId: retailOwnerUser.id,
    },
  });

  const restaurantBusiness = await prisma.business.upsert({
    where: { slug: 'demo-restaurant' },
    update: {},
    create: {
      name: 'Demo Restaurant',
      slug: 'demo-restaurant',
      businessType: BusinessType.RESTAURANT,
      ownerUserId: restaurantOwnerUser.id,
    },
  });

  const retailOutletOne = await prisma.outlet.upsert({
    where: {
      businessId_code: {
        businessId: retailBusiness.id,
        code: 'OUTLET-01',
      },
    },
    update: {},
    create: {
      businessId: retailBusiness.id,
      name: 'Demo Retail Outlet Utama',
      code: 'OUTLET-01',
      address: 'Jl. Contoh Retail No. 1',
      phone: '081234567890',
    },
  });

  const retailOutletTwo = await prisma.outlet.upsert({
    where: {
      businessId_code: {
        businessId: retailBusiness.id,
        code: 'OUTLET-02',
      },
    },
    update: {},
    create: {
      businessId: retailBusiness.id,
      name: 'Demo Retail Outlet Kedua',
      code: 'OUTLET-02',
      address: 'Jl. Contoh Retail No. 2',
      phone: '081234567891',
    },
  });

  const restaurantOutletOne = await prisma.outlet.upsert({
    where: {
      businessId_code: {
        businessId: restaurantBusiness.id,
        code: 'RESTO-01',
      },
    },
    update: {},
    create: {
      businessId: restaurantBusiness.id,
      name: 'Demo Resto Outlet Utama',
      code: 'RESTO-01',
      address: 'Jl. Contoh Resto No. 1',
      phone: '081234567892',
    },
  });

  const restaurantOutletTwo = await prisma.outlet.upsert({
    where: {
      businessId_code: {
        businessId: restaurantBusiness.id,
        code: 'RESTO-02',
      },
    },
    update: {},
    create: {
      businessId: restaurantBusiness.id,
      name: 'Demo Resto Outlet Kedua',
      code: 'RESTO-02',
      address: 'Jl. Contoh Resto No. 2',
      phone: '081234567893',
    },
  });

  const retailOwnerBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: retailBusiness.id,
        userId: retailOwnerUser.id,
      },
    },
    update: {
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
    create: {
      businessId: retailBusiness.id,
      userId: retailOwnerUser.id,
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
  });

  const retailSuperAdminBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: retailBusiness.id,
        userId: superAdminRetail.id,
      },
    },
    update: {
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: true,
    },
    create: {
      businessId: retailBusiness.id,
      userId: superAdminRetail.id,
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: true,
    },
  });

  const retailAdminAllOutletBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: retailBusiness.id,
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
      businessId: retailBusiness.id,
      userId: adminAllOutletUser.id,
      businessRoleId: adminRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: true,
    },
  });

  const retailAdminLimitedBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: retailBusiness.id,
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
      businessId: retailBusiness.id,
      userId: adminLimitedUser.id,
      businessRoleId: adminRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  const retailCashierBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: retailBusiness.id,
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
      businessId: retailBusiness.id,
      userId: cashierUser.id,
      businessRoleId: cashierRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  const retailInventoryBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: retailBusiness.id,
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
      businessId: retailBusiness.id,
      userId: inventoryUser.id,
      businessRoleId: inventoryRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  const restaurantOwnerBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: restaurantBusiness.id,
        userId: restaurantOwnerUser.id,
      },
    },
    update: {
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
    create: {
      businessId: restaurantBusiness.id,
      userId: restaurantOwnerUser.id,
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: true,
      hasAllOutletAccess: true,
    },
  });

  const restaurantSuperAdminBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: restaurantBusiness.id,
        userId: superAdminRestaurant.id,
      },
    },
    update: {
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: true,
    },
    create: {
      businessId: restaurantBusiness.id,
      userId: superAdminRestaurant.id,
      businessRoleId: ownerRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: true,
    },
  });

  const restaurantKitchenBusinessUser = await prisma.businessUser.upsert({
    where: {
      businessId_userId: {
        businessId: restaurantBusiness.id,
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
      businessId: restaurantBusiness.id,
      userId: kitchenUser.id,
      businessRoleId: kitchenRole.id,
      status: BusinessUserStatus.ACTIVE,
      isPrimary: false,
      hasAllOutletAccess: false,
    },
  });

  const accessRows = [
    {
      businessUserId: retailAdminLimitedBusinessUser.id,
      outletId: retailOutletOne.id,
    },
    {
      businessUserId: retailCashierBusinessUser.id,
      outletId: retailOutletOne.id,
    },
    {
      businessUserId: retailInventoryBusinessUser.id,
      outletId: retailOutletTwo.id,
    },
    {
      businessUserId: restaurantKitchenBusinessUser.id,
      outletId: restaurantOutletOne.id,
    },
  ];

  for (const accessRow of accessRows) {
    await prisma.businessUserOutletAccess.upsert({
      where: {
        businessUserId_outletId: {
          businessUserId: accessRow.businessUserId,
          outletId: accessRow.outletId,
        },
      },
      update: {},
      create: accessRow,
    });
  }

  await prisma.businessUserOutletAccess.deleteMany({
    where: {
      businessUserId: {
        in: [
          retailSuperAdminBusinessUser.id,
          restaurantSuperAdminBusinessUser.id,
          retailOwnerBusinessUser.id,
          restaurantOwnerBusinessUser.id,
          retailAdminAllOutletBusinessUser.id,
        ],
      },
    },
  });

  await prisma.businessUserOutletAccess.createMany({
    data: [
      {
        businessUserId: retailSuperAdminBusinessUser.id,
        outletId: retailOutletOne.id,
      },
      {
        businessUserId: retailSuperAdminBusinessUser.id,
        outletId: retailOutletTwo.id,
      },
      {
        businessUserId: restaurantSuperAdminBusinessUser.id,
        outletId: restaurantOutletOne.id,
      },
      {
        businessUserId: restaurantSuperAdminBusinessUser.id,
        outletId: restaurantOutletTwo.id,
      },
      {
        businessUserId: retailOwnerBusinessUser.id,
        outletId: retailOutletOne.id,
      },
      {
        businessUserId: retailOwnerBusinessUser.id,
        outletId: retailOutletTwo.id,
      },
      {
        businessUserId: restaurantOwnerBusinessUser.id,
        outletId: restaurantOutletOne.id,
      },
      {
        businessUserId: restaurantOwnerBusinessUser.id,
        outletId: restaurantOutletTwo.id,
      },
      {
        businessUserId: retailAdminAllOutletBusinessUser.id,
        outletId: retailOutletOne.id,
      },
      {
        businessUserId: retailAdminAllOutletBusinessUser.id,
        outletId: retailOutletTwo.id,
      },
    ],
    skipDuplicates: true,
  });

  await enableFeatureFlag(
    retailBusiness.id,
    'BUSINESS_MANAGEMENT',
    'Business Management',
    'Kelola business',
  );
  await enableFeatureFlag(
    retailBusiness.id,
    'OUTLET_MANAGEMENT',
    'Outlet Management',
    'Kelola outlet',
  );
  await enableFeatureFlag(
    retailBusiness.id,
    'BASIC_DASHBOARD',
    'Basic Dashboard',
    'Dashboard dasar',
  );
  await enableFeatureFlag(
    retailBusiness.id,
    'CATEGORY_MANAGEMENT',
    'Category Management',
    'Kelola kategori',
  );
  await enableFeatureFlag(
    retailBusiness.id,
    'PRODUCT_MANAGEMENT',
    'Product Management',
    'Kelola product/menu',
  );
  
  await enableFeatureFlag(
    retailBusiness.id,
    'GUEST_QR',
    'Guest QR',
    'Aktifkan modul QR tamu untuk pemesanan tanpa login',
    false,
  );
  await enableFeatureFlag(
    retailBusiness.id,
    'TABLE_MANAGEMENT',
    'Table Management',
    'Kelola meja outlet',
    false,
  );

  await enableFeatureFlag(
    restaurantBusiness.id,
    'BUSINESS_MANAGEMENT',
    'Business Management',
    'Kelola business',
  );
  await enableFeatureFlag(
    restaurantBusiness.id,
    'OUTLET_MANAGEMENT',
    'Outlet Management',
    'Kelola outlet',
  );
  await enableFeatureFlag(
    restaurantBusiness.id,
    'BASIC_DASHBOARD',
    'Basic Dashboard',
    'Dashboard dasar',
  );
  await enableFeatureFlag(
    restaurantBusiness.id,
    'CATEGORY_MANAGEMENT',
    'Category Management',
    'Kelola kategori',
  );
  
  await enableFeatureFlag(
    restaurantBusiness.id,
    'KITCHEN_DISPLAY',
    'Kitchen Display',
    'Aktifkan modul Kitchen untuk RESTAURANT',
    true,
  );
  
  await enableFeatureFlag(
    restaurantBusiness.id,
    'GUEST_QR',
    'Guest QR',
    'Aktifkan modul QR tamu untuk pemesanan tanpa login',
    false,
  );
  await enableFeatureFlag(
    restaurantBusiness.id,
    'TABLE_MANAGEMENT',
    'Table Management',
    'Kelola meja outlet',
    true,
  );

  const retailCategoryBeverages = await prisma.category.upsert({
    where: {
      businessId_name: {
        businessId: retailBusiness.id,
        name: 'Minuman',
      },
    },
    update: {
      code: 'CAT-MINUMAN',
      description: 'Kategori minuman retail',
      sortOrder: 1,
      status: CategoryStatus.ACTIVE,
    },
    create: {
      businessId: retailBusiness.id,
      name: 'Minuman',
      code: 'CAT-MINUMAN',
      description: 'Kategori minuman retail',
      sortOrder: 1,
      status: CategoryStatus.ACTIVE,
    },
  });

  const retailCategorySnacks = await prisma.category.upsert({
    where: {
      businessId_name: {
        businessId: retailBusiness.id,
        name: 'Snack',
      },
    },
    update: {
      code: 'CAT-SNACK',
      description: 'Kategori snack retail',
      sortOrder: 2,
      status: CategoryStatus.ACTIVE,
    },
    create: {
      businessId: retailBusiness.id,
      name: 'Snack',
      code: 'CAT-SNACK',
      description: 'Kategori snack retail',
      sortOrder: 2,
      status: CategoryStatus.ACTIVE,
    },
  });

  const restaurantCategoryFood = await prisma.category.upsert({
    where: {
      businessId_name: {
        businessId: restaurantBusiness.id,
        name: 'Makanan',
      },
    },
    update: {
      code: 'CAT-MAKANAN',
      description: 'Kategori makanan restaurant',
      sortOrder: 1,
      status: CategoryStatus.ACTIVE,
    },
    create: {
      businessId: restaurantBusiness.id,
      name: 'Makanan',
      code: 'CAT-MAKANAN',
      description: 'Kategori makanan restaurant',
      sortOrder: 1,
      status: CategoryStatus.ACTIVE,
    },
  });

  const restaurantCategoryDrink = await prisma.category.upsert({
    where: {
      businessId_name: {
        businessId: restaurantBusiness.id,
        name: 'Minuman',
      },
    },
    update: {
      code: 'CAT-MINUMAN',
      description: 'Kategori minuman restaurant',
      sortOrder: 2,
      status: CategoryStatus.ACTIVE,
    },
    create: {
      businessId: restaurantBusiness.id,
      name: 'Minuman',
      code: 'CAT-MINUMAN',
      description: 'Kategori minuman restaurant',
      sortOrder: 2,
      status: CategoryStatus.ACTIVE,
    },
  });

  const retailProductTea = await prisma.product.upsert({
    where: {
      businessId_code: {
        businessId: retailBusiness.id,
        code: 'PRD-TEH-BOTOL',
      },
    },
    update: {
      categoryId: retailCategoryBeverages.id,
      name: 'Teh Botol',
      sku: 'SKU-TEH-BOTOL',
      barcode: '8992761130012',
      brand: 'Sosro',
      unit: 'Botol',
      description: 'Teh botol retail',
      imageUrl: '/products/teh-botol.jpg',
      basePrice: 5000,
      status: ProductStatus.ACTIVE,
    },
    create: {
      businessId: retailBusiness.id,
      categoryId: retailCategoryBeverages.id,
      name: 'Teh Botol',
      code: 'PRD-TEH-BOTOL',
      sku: 'SKU-TEH-BOTOL',
      barcode: '8992761130012',
      brand: 'Sosro',
      unit: 'Botol',
      description: 'Teh botol retail',
      imageUrl: '/products/teh-botol.jpg',
      basePrice: 5000,
      status: ProductStatus.ACTIVE,
    },
  });

  const retailProductChips = await prisma.product.upsert({
    where: {
      businessId_code: {
        businessId: retailBusiness.id,
        code: 'PRD-KERIPIK',
      },
    },
    update: {
      categoryId: retailCategorySnacks.id,
      name: 'Keripik Kentang',
      sku: 'SKU-KERIPIK',
      barcode: '8996001600027',
      brand: 'Qtela',
      unit: 'Pcs',
      description: 'Keripik kentang retail',
      imageUrl: '/products/product-1775009872291-853994.jpg',
      basePrice: 12000,
      status: ProductStatus.ACTIVE,
    },
    create: {
      businessId: retailBusiness.id,
      categoryId: retailCategorySnacks.id,
      name: 'Keripik Kentang',
      code: 'PRD-KERIPIK',
      sku: 'SKU-KERIPIK',
      barcode: '8996001600027',
      brand: 'Qtela',
      unit: 'Pcs',
      description: 'Keripik kentang retail',
      imageUrl: '/products/product-1775009872291-853994.jpg',
      basePrice: 12000,
      status: ProductStatus.ACTIVE,
    },
  });

  const restaurantProductNasiGoreng = await prisma.product.upsert({
    where: {
      businessId_code: {
        businessId: restaurantBusiness.id,
        code: 'MENU-NASGOR',
      },
    },
    update: {
      categoryId: restaurantCategoryFood.id,
      name: 'Nasi Goreng Special',
      sku: 'SKU-NASGOR',
      brand: 'Kitchen Internal',
      unit: 'Porsi',
      description: 'Menu nasi goreng special',
      imageUrl: '/products/product-1775009480141-183885.jpg',
      basePrice: 28000,
      status: ProductStatus.ACTIVE,
    },
    create: {
      businessId: restaurantBusiness.id,
      categoryId: restaurantCategoryFood.id,
      name: 'Nasi Goreng Special',
      code: 'MENU-NASGOR',
      sku: 'SKU-NASGOR',
      brand: 'Kitchen Internal',
      unit: 'Porsi',
      description: 'Menu nasi goreng special',
      imageUrl: '/products/product-1775009480141-183885.jpg',
      basePrice: 28000,
      status: ProductStatus.ACTIVE,
    },
  });

  const restaurantProductEsTeh = await prisma.product.upsert({
    where: {
      businessId_code: {
        businessId: restaurantBusiness.id,
        code: 'MENU-ESTEH',
      },
    },
    update: {
      categoryId: restaurantCategoryDrink.id,
      name: 'Es Teh Manis',
      sku: 'SKU-ESTEH',
      brand: 'Kitchen Internal',
      unit: 'Gelas',
      description: 'Menu es teh manis',
      imageUrl: '/products/product-1775009460549-729937.jpg',
      basePrice: 8000,
      status: ProductStatus.ACTIVE,
    },
    create: {
      businessId: restaurantBusiness.id,
      categoryId: restaurantCategoryDrink.id,
      name: 'Es Teh Manis',
      code: 'MENU-ESTEH',
      sku: 'SKU-ESTEH',
      brand: 'Kitchen Internal',
      unit: 'Gelas',
      description: 'Menu es teh manis',
      imageUrl: '/products/product-1775009460549-729937.jpg',
      basePrice: 8000,
      status: ProductStatus.ACTIVE,
    },
  });

  const retailProductOutletSettings = [
    {
      productId: retailProductTea.id,
      outletId: retailOutletOne.id,
      isAvailable: true,
      priceOverride: 5000,
      status: ProductOutletStatus.ACTIVE,
    },
    {
      productId: retailProductTea.id,
      outletId: retailOutletTwo.id,
      isAvailable: true,
      priceOverride: 5500,
      status: ProductOutletStatus.ACTIVE,
    },
    {
      productId: retailProductChips.id,
      outletId: retailOutletOne.id,
      isAvailable: true,
      priceOverride: 12000,
      status: ProductOutletStatus.ACTIVE,
    },
    {
      productId: retailProductChips.id,
      outletId: retailOutletTwo.id,
      isAvailable: false,
      priceOverride: null,
      status: ProductOutletStatus.INACTIVE,
    },
  ];

  for (const item of retailProductOutletSettings) {
    await prisma.productOutletSetting.upsert({
      where: {
        productId_outletId: {
          productId: item.productId,
          outletId: item.outletId,
        },
      },
      update: {
        isAvailable: item.isAvailable,
        priceOverride: item.priceOverride,
        status: item.status,
      },
      create: item,
    });
  }

  const restaurantProductOutletSettings = [
    {
      productId: restaurantProductNasiGoreng.id,
      outletId: restaurantOutletOne.id,
      isAvailable: true,
      priceOverride: 28000,
      status: ProductOutletStatus.ACTIVE,
    },
    {
      productId: restaurantProductNasiGoreng.id,
      outletId: restaurantOutletTwo.id,
      isAvailable: true,
      priceOverride: 30000,
      status: ProductOutletStatus.ACTIVE,
    },
    {
      productId: restaurantProductEsTeh.id,
      outletId: restaurantOutletOne.id,
      isAvailable: true,
      priceOverride: 8000,
      status: ProductOutletStatus.ACTIVE,
    },
    {
      productId: restaurantProductEsTeh.id,
      outletId: restaurantOutletTwo.id,
      isAvailable: true,
      priceOverride: 9000,
      status: ProductOutletStatus.ACTIVE,
    },
  ];

  for (const item of restaurantProductOutletSettings) {
    await prisma.productOutletSetting.upsert({
      where: {
        productId_outletId: {
          productId: item.productId,
          outletId: item.outletId,
        },
      },
      update: {
        isAvailable: item.isAvailable,
        priceOverride: item.priceOverride,
        status: item.status,
      },
      create: item,
    });
  }

  const restaurantTables = [
    {
      outletId: restaurantOutletOne.id,
      code: 'T01',
      name: 'Meja 01',
      capacity: 4,
      status: OutletTableStatus.ACTIVE,
    },
    {
      outletId: restaurantOutletOne.id,
      code: 'T02',
      name: 'Meja 02',
      capacity: 4,
      status: OutletTableStatus.ACTIVE,
    },
    {
      outletId: restaurantOutletTwo.id,
      code: 'T01',
      name: 'Meja 01',
      capacity: 2,
      status: OutletTableStatus.ACTIVE,
    },
    {
      outletId: restaurantOutletTwo.id,
      code: 'T02',
      name: 'Meja 02',
      capacity: 6,
      status: OutletTableStatus.ACTIVE,
    },
  ];

  for (const table of restaurantTables) {
    await prisma.outletTable.upsert({
      where: {
        outletId_code: {
          outletId: table.outletId,
          code: table.code,
        },
      },
      update: {
        name: table.name,
        capacity: table.capacity,
        status: table.status,
      },
      create: table,
    });
  }

  const retailPromoAllOutlets = await upsertPromoByBusinessAndName({
    businessId: retailBusiness.id,
    name: 'Promo Teh Semua Outlet',
    description: 'Promo Teh Botol berlaku untuk semua outlet retail',
    targetType: PromoTargetType.PRODUCT,
    categoryId: null,
    productId: retailProductTea.id,
    targetTextValue: null,
    discountType: PromoDiscountType.FIXED_AMOUNT,
    discountValue: 1000,
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2026-04-30T23:59:59.000Z'),
    startTime: '08:00',
    endTime: '22:00',
    status: PromoStatus.ACTIVE,
    outletScope: PromoOutletScope.ALL_OUTLETS,
  });

  const retailPromoSelectedOutlet = await upsertPromoByBusinessAndName({
    businessId: retailBusiness.id,
    name: 'Promo Snack Outlet Tertentu',
    description: 'Promo snack hanya berlaku di outlet retail tertentu',
    targetType: PromoTargetType.CATEGORY,
    categoryId: retailCategorySnacks.id,
    productId: null,
    targetTextValue: null,
    discountType: PromoDiscountType.PERCENTAGE,
    discountValue: 10,
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2026-04-30T23:59:59.000Z'),
    startTime: '08:00',
    endTime: '22:00',
    status: PromoStatus.ACTIVE,
    outletScope: PromoOutletScope.SELECTED_OUTLETS,
  });

  const restaurantPromoAllOutlets = await upsertPromoByBusinessAndName({
    businessId: restaurantBusiness.id,
    name: 'Promo Es Teh Semua Outlet',
    description: 'Promo es teh berlaku di semua outlet restaurant',
    targetType: PromoTargetType.PRODUCT,
    categoryId: null,
    productId: restaurantProductEsTeh.id,
    targetTextValue: null,
    discountType: PromoDiscountType.FIXED_AMOUNT,
    discountValue: 2000,
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2026-04-30T23:59:59.000Z'),
    startTime: '10:00',
    endTime: '21:00',
    status: PromoStatus.ACTIVE,
    outletScope: PromoOutletScope.ALL_OUTLETS,
  });

  const restaurantPromoSelectedOutlet = await upsertPromoByBusinessAndName({
    businessId: restaurantBusiness.id,
    name: 'Promo Nasi Goreng Outlet Utama',
    description: 'Promo nasi goreng hanya berlaku di outlet utama restaurant',
    targetType: PromoTargetType.PRODUCT,
    categoryId: null,
    productId: restaurantProductNasiGoreng.id,
    targetTextValue: null,
    discountType: PromoDiscountType.PERCENTAGE,
    discountValue: 15,
    startDate: new Date('2026-04-01T00:00:00.000Z'),
    endDate: new Date('2026-04-30T23:59:59.000Z'),
    startTime: '11:00',
    endTime: '20:00',
    status: PromoStatus.ACTIVE,
    outletScope: PromoOutletScope.SELECTED_OUTLETS,
  });

  await prisma.promoOutlet.deleteMany({
    where: {
      promoId: {
        in: [
          retailPromoAllOutlets.id,
          retailPromoSelectedOutlet.id,
          restaurantPromoAllOutlets.id,
          restaurantPromoSelectedOutlet.id,
        ],
      },
    },
  });

  await prisma.promoOutlet.createMany({
    data: [
      {
        promoId: retailPromoSelectedOutlet.id,
        outletId: retailOutletOne.id,
      },
      {
        promoId: restaurantPromoSelectedOutlet.id,
        outletId: restaurantOutletOne.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed completed.');
  console.log({
    superAdmins: {
      retail: {
        email: 'superadmin-retail@pos.local',
        password: 'password123',
      },
      restaurant: {
        email: 'superadmin-resto@pos.local',
        password: 'password123',
      },
    },
    retailOwner: {
      email: 'owner@demo.local',
      password: 'password123',
    },
    restaurantOwner: {
      email: 'owner-resto@demo.local',
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
    businesses: {
      retail: {
        slug: retailBusiness.slug,
        type: retailBusiness.businessType,
      },
      restaurant: {
        slug: restaurantBusiness.slug,
        type: restaurantBusiness.businessType,
      },
    },
    outlets: {
      retail: [retailOutletOne.code, retailOutletTwo.code],
      restaurant: [restaurantOutletOne.code, restaurantOutletTwo.code],
    },
    phase3: {
      retailCategories: ['Minuman', 'Snack'],
      restaurantCategories: ['Makanan', 'Minuman'],
      retailProducts: ['Teh Botol', 'Keripik Kentang'],
      restaurantProducts: ['Nasi Goreng Special', 'Es Teh Manis'],
      restaurantTables: [
        'RESTO-01:T01',
        'RESTO-01:T02',
        'RESTO-02:T01',
        'RESTO-02:T02',
      ],
    },
    phase4: {
      permissions: [
        'ORDER_VIEW',
        'ORDER_CREATE',
        'ORDER_UPDATE',
        'ORDER_STATUS_UPDATE',
        'PAYMENT_VIEW',
        'PAYMENT_CREATE',
        'PAYMENT_STATUS_UPDATE',
        'RECEIPT_VIEW',
      ],
      receiptSnapshotFields: [
        'businessName',
        'outletName',
        'outletAddress',
        'contentSnapshot',
      ],
    },
    promoOutletScope: {
      retailAllOutlets: retailPromoAllOutlets.name,
      retailSelectedOutlet: {
        promoName: retailPromoSelectedOutlet.name,
        outlets: [retailOutletOne.code],
      },
      restaurantAllOutlets: restaurantPromoAllOutlets.name,
      restaurantSelectedOutlet: {
        promoName: restaurantPromoSelectedOutlet.name,
        outlets: [restaurantOutletOne.code],
      },
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

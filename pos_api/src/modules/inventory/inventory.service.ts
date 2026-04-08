import { Prisma, InventoryMovementType } from '@prisma/client';
import { prisma } from '../../config/prisma';

function boolFromString(val: string | undefined): boolean | undefined {
  if (val === undefined) return undefined;
  return val === 'true';
}

export async function ensureInventoryItem(businessId: string, outletId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, businessId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!product) {
    throw new Error('Produk tidak ditemukan di business aktif');
  }

  const outlet = await prisma.outlet.findFirst({
    where: { id: outletId, businessId, status: 'ACTIVE' },
    select: { id: true },
  });

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan di business aktif');
  }

  const existing = await prisma.inventoryItem.findFirst({
    where: { businessId, outletId, productId },
  });

  if (existing) return existing;

  return prisma.inventoryItem.create({
    data: {
      businessId,
      outletId,
      productId,
      stockOnHand: new Prisma.Decimal(0),
    },
  });
}

export async function stockChange(
  businessUserId: string | null,
  businessId: string,
  outletId: string,
  productId: string,
  type: InventoryMovementType,
  quantity: number,
  note?: string,
  referenceType?: string,
  referenceId?: string,
) {
  const item = await ensureInventoryItem(businessId, outletId, productId);

  return prisma.$transaction(async (tx) => {
    const current = await tx.inventoryItem.findUniqueOrThrow({ where: { id: item.id } });

    const increment =
      type === 'IN' || type === 'ADJUSTMENT_IN'
        ? new Prisma.Decimal(quantity)
        : new Prisma.Decimal(-quantity);

    const nextStock = current.stockOnHand.plus(increment);

    if (nextStock.isNeg()) {
      throw new Error('Stock tidak mencukupi untuk operasi ini');
    }

    const updated = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        stockOnHand: nextStock,
        lastMovementAt: new Date(),
      },
    });

    const movement = await tx.inventoryMovement.create({
      data: {
        businessId,
        outletId,
        productId,
        inventoryItemId: item.id,
        type,
        quantity: new Prisma.Decimal(quantity),
        note: note ?? null,
        referenceType: referenceType ?? null,
        referenceId: referenceId ?? null,
        createdByBusinessUserId: businessUserId,
      },
    });

    return { updated, movement };
  });
}

export async function getStockSummary(params: {
  businessId: string;
  outletId: string;
  search?: string;
  categoryId?: string;
  productStatus?: 'ACTIVE' | 'INACTIVE';
  available?: string; // 'true' | 'false'
}) {
  const { businessId, outletId, search, categoryId, productStatus } = params;
  const available = boolFromString(params.available);

  const products = await prisma.product.findMany({
    where: {
      businessId,
      ...(productStatus ? { status: productStatus } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { code: { contains: search, mode: 'insensitive' } },
              { sku: { contains: search, mode: 'insensitive' } },
              { barcode: { contains: search, mode: 'insensitive' } },
              { brand: { contains: search, mode: 'insensitive' } },
              { unit: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      businessId: true,
      categoryId: true,
      name: true,
      code: true,
      sku: true,
      barcode: true,
      brand: true,
      unit: true,
      status: true,
      productOutletSettings: {
        where: { outletId },
        select: {
          isAvailable: true,
          status: true,
          priceOverride: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const items = await prisma.inventoryItem.findMany({
    where: { businessId, outletId, productId: { in: products.map((p) => p.id) } },
    select: { productId: true, stockOnHand: true },
  });

  const stockMap = new Map<string, Prisma.Decimal>();
  for (const it of items) stockMap.set(it.productId, it.stockOnHand);

  const summary = products
    .filter((p) => {
      if (available === undefined) return true;
      const setting = p.productOutletSettings[0];
      if (!setting) return available === false ? true : false; // jika filter available=true tapi tidak ada setting → exclude
      return available ? setting.isAvailable && setting.status === 'ACTIVE' : !setting.isAvailable || setting.status !== 'ACTIVE';
    })
    .map((p) => {
      const setting = p.productOutletSettings[0];
      const stock = stockMap.get(p.id) ?? new Prisma.Decimal(0);
      return {
        productId: p.id,
        outletId,
        businessId: p.businessId,
        categoryId: p.categoryId,
        productName: p.name,
        productCode: p.code,
        sku: p.sku,
        barcode: p.barcode,
        brand: p.brand,
        unit: p.unit,
        productStatus: p.status,
        isAvailable: setting ? setting.isAvailable : false,
        productOutletStatus: setting ? setting.status : null,
        priceOverride: setting?.priceOverride?.toString() ?? null,
        stockOnHand: stock.toString(),
      };
    });

  return summary;
}

export async function getMovements(params: {
  businessId: string;
  outletId: string;
  productId?: string;
  type?: InventoryMovementType;
  search?: string;
}) {
  const { businessId, outletId, productId, type, search } = params;

  const movements = await prisma.inventoryMovement.findMany({
    where: {
      businessId,
      outletId,
      ...(productId ? { productId } : {}),
      ...(type ? { type } : {}),
      ...(search
        ? {
            product: {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { code: { contains: search, mode: 'insensitive' } },
                { sku: { contains: search, mode: 'insensitive' } },
                { barcode: { contains: search, mode: 'insensitive' } },
              ],
            },
          }
        : {}),
    },
    include: {
      product: { select: { name: true, code: true, sku: true, barcode: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return movements.map((m) => ({
    id: m.id,
    businessId: m.businessId,
    outletId: m.outletId,
    productId: m.productId,
    type: m.type,
    quantity: m.quantity.toString(),
    note: m.note,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    createdByBusinessUserId: m.createdByBusinessUserId,
    createdAt: m.createdAt,
    productName: m.product.name,
    productCode: m.product.code,
    sku: m.product.sku,
    barcode: m.product.barcode,
  }));
}

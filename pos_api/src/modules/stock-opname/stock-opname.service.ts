import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type { StockOpnameListItem, StockOpnameDetail, CountItemInput } from './stock-opname.types';

export async function createStockOpname(
  businessId: string,
  outletId: string,
  createdByBusinessUserId: string | null,
  note?: string,
): Promise<{ id: string }> {
  const outlet = await prisma.outlet.findFirst({
    where: { id: outletId, businessId, status: 'ACTIVE' },
    select: { id: true },
  });
  if (!outlet) throw new Error('Outlet tidak ditemukan');

  const inventoryItems = await prisma.inventoryItem.findMany({
    where: { businessId, outletId },
    select: { productId: true, stockOnHand: true },
  });

  const allProducts = await prisma.product.findMany({
    where: { businessId, status: 'ACTIVE' },
    select: { id: true },
  });

  const itemMap = new Map<string, Prisma.Decimal>();
  for (const it of inventoryItems) itemMap.set(it.productId, it.stockOnHand);

  const opname = await prisma.stockOpname.create({
    data: {
      businessId,
      outletId,
      note: note ?? null,
      createdByBusinessUserId,
      items: {
        create: allProducts.map((p) => ({
          productId: p.id,
          systemStock: itemMap.get(p.id) ?? new Prisma.Decimal(0),
        })),
      },
    },
    select: { id: true },
  });

  return opname;
}

export async function listStockOpnames(params: {
  businessId: string;
  outletId?: string;
  status?: 'DRAFT' | 'FINALIZED' | 'CANCELLED';
}): Promise<StockOpnameListItem[]> {
  const { businessId, outletId, status } = params;

  const opnames = await prisma.stockOpname.findMany({
    where: {
      businessId,
      ...(outletId ? { outletId } : {}),
      ...(status ? { status } : {}),
    },
    select: {
      id: true,
      businessId: true,
      outletId: true,
      status: true,
      note: true,
      finalizedAt: true,
      cancelledAt: true,
      createdAt: true,
      outlet: { select: { name: true } },
      createdBy: { select: { user: { select: { fullName: true } } } },
      finalizedBy: { select: { user: { select: { fullName: true } } } },
      _count: { select: { items: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const results: StockOpnameListItem[] = [];
  for (const o of opnames) {
    const countedCount = await prisma.stockOpnameItem.count({
      where: { stockOpnameId: o.id, countedStock: { not: null } },
    });

    results.push({
      id: o.id,
      businessId: o.businessId,
      outletId: o.outletId,
      outletName: o.outlet.name,
      status: o.status,
      note: o.note,
      createdByName: o.createdBy?.user.fullName ?? null,
      finalizedByName: o.finalizedBy?.user.fullName ?? null,
      finalizedAt: o.finalizedAt,
      cancelledAt: o.cancelledAt,
      createdAt: o.createdAt,
      itemCount: o._count.items,
      countedCount,
    });
  }

  return results;
}

export async function getStockOpnameDetail(
  businessId: string,
  opnameId: string,
): Promise<StockOpnameDetail> {
  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, businessId },
    select: {
      id: true,
      businessId: true,
      outletId: true,
      status: true,
      note: true,
      finalizedAt: true,
      cancelledAt: true,
      createdAt: true,
      outlet: { select: { name: true } },
      createdBy: { select: { user: { select: { fullName: true } } } },
      finalizedBy: { select: { user: { select: { fullName: true } } } },
      items: {
        select: {
          id: true,
          productId: true,
          systemStock: true,
          countedStock: true,
          variance: true,
          note: true,
          product: { select: { name: true, code: true, sku: true, barcode: true, unit: true } },
        },
        orderBy: { product: { name: 'asc' } },
      },
    },
  });

  if (!opname) throw new Error('Stock opname tidak ditemukan');

  return {
    id: opname.id,
    businessId: opname.businessId,
    outletId: opname.outletId,
    outletName: opname.outlet.name,
    status: opname.status,
    note: opname.note,
    createdByName: opname.createdBy?.user.fullName ?? null,
    finalizedByName: opname.finalizedBy?.user.fullName ?? null,
    finalizedAt: opname.finalizedAt,
    cancelledAt: opname.cancelledAt,
    createdAt: opname.createdAt,
    items: opname.items.map((it) => ({
      id: it.id,
      productId: it.productId,
      productName: it.product.name,
      productCode: it.product.code,
      sku: it.product.sku,
      barcode: it.product.barcode,
      unit: it.product.unit,
      systemStock: it.systemStock.toString(),
      countedStock: it.countedStock?.toString() ?? null,
      variance: it.variance?.toString() ?? null,
      note: it.note,
    })),
  };
}

export async function updateOpnameItems(
  businessId: string,
  opnameId: string,
  items: CountItemInput[],
): Promise<void> {
  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, businessId },
    select: { id: true, status: true },
  });
  if (!opname) throw new Error('Stock opname tidak ditemukan');
  if (opname.status !== 'DRAFT') throw new Error('Hanya sesi DRAFT yang bisa diupdate');

  for (const item of items) {
    const counted = new Prisma.Decimal(item.countedStock);
    const opnameItem = await prisma.stockOpnameItem.findFirst({
      where: { stockOpnameId: opnameId, productId: item.productId },
      select: { id: true, systemStock: true },
    });
    if (!opnameItem) continue;
    const variance = counted.minus(opnameItem.systemStock);
    await prisma.stockOpnameItem.update({
      where: { id: opnameItem.id },
      data: { countedStock: counted, variance, note: item.note ?? null, updatedAt: new Date() },
    });
  }
}

export async function finalizeStockOpname(
  businessId: string,
  outletId: string,
  opnameId: string,
  finalizedByBusinessUserId: string | null,
  note?: string,
): Promise<void> {
  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, businessId },
    select: {
      id: true,
      status: true,
      items: {
        where: { countedStock: { not: null } },
        select: { productId: true, countedStock: true, systemStock: true, variance: true },
      },
    },
  });

  if (!opname) throw new Error('Stock opname tidak ditemukan');
  if (opname.status !== 'DRAFT') throw new Error('Hanya sesi DRAFT yang bisa di-finalize');

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    for (const item of opname.items) {
      if (!item.variance || item.variance.equals(0)) continue;

      const isPositive = item.variance.greaterThan(0);
      const absVariance = item.variance.abs();
      const movementType = isPositive ? ('OPNAME_IN' as const) : ('OPNAME_OUT' as const);

      let invItem = await tx.inventoryItem.findFirst({
        where: { businessId, outletId, productId: item.productId },
        select: { id: true, stockOnHand: true },
      });

      if (!invItem) {
        invItem = await tx.inventoryItem.create({
          data: { businessId, outletId, productId: item.productId, stockOnHand: new Prisma.Decimal(0) },
          select: { id: true, stockOnHand: true },
        });
      }

      const newStock = invItem.stockOnHand.plus(item.variance);
      if (newStock.isNeg()) throw new Error(`Stok akan negatif untuk produk ${item.productId}`);

      await tx.inventoryItem.update({
        where: { id: invItem.id },
        data: { stockOnHand: newStock, lastMovementAt: now },
      });

      await tx.inventoryMovement.create({
        data: {
          businessId,
          outletId,
          productId: item.productId,
          inventoryItemId: invItem.id,
          type: movementType,
          quantity: absVariance,
          note: note ?? `Stock opname #${opnameId.slice(0, 8)}`,
          referenceType: 'STOCK_OPNAME',
          referenceId: opnameId,
          createdByBusinessUserId: finalizedByBusinessUserId,
        },
      });
    }

    await tx.stockOpname.update({
      where: { id: opnameId },
      data: {
        status: 'FINALIZED',
        finalizedByBusinessUserId,
        finalizedAt: now,
        ...(note ? { note } : {}),
      },
    });
  });
}

export async function cancelStockOpname(businessId: string, opnameId: string): Promise<void> {
  const opname = await prisma.stockOpname.findFirst({
    where: { id: opnameId, businessId },
    select: { id: true, status: true },
  });
  if (!opname) throw new Error('Stock opname tidak ditemukan');
  if (opname.status !== 'DRAFT') throw new Error('Hanya sesi DRAFT yang bisa dibatalkan');

  await prisma.stockOpname.update({
    where: { id: opnameId },
    data: { status: 'CANCELLED', cancelledAt: new Date() },
  });
}

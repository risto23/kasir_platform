import { prisma } from '../../config/prisma';
import type { Prisma } from '@prisma/client';

export type SurchargeRule = {
  minAmount: number;
  maxAmount: number | null;
  type: 'PERCENTAGE' | 'FLAT';
  value: number;
};

export type OutletPaymentMethodDto = {
  id: string;
  outletId: string;
  businessId: string;
  name: string;
  code: string;
  isActive: boolean;
  surchargeRules: SurchargeRule[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export function parseSurchargeRules(raw: Prisma.JsonValue): SurchargeRule[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (r): r is SurchargeRule =>
      typeof r === 'object' && r !== null && 'type' in r && 'value' in r,
  );
}

function toDto(row: {
  id: string;
  outletId: string;
  businessId: string;
  name: string;
  code: string;
  isActive: boolean;
  surchargeRules: Prisma.JsonValue;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}): OutletPaymentMethodDto {
  return {
    id: row.id,
    outletId: row.outletId,
    businessId: row.businessId,
    name: row.name,
    code: row.code,
    isActive: row.isActive,
    surchargeRules: parseSurchargeRules(row.surchargeRules),
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function calculateSurcharge(amount: number, rules: SurchargeRule[]): number {
  if (!rules.length) return 0;
  const sorted = [...rules].sort((a, b) => a.minAmount - b.minAmount);
  let rule: SurchargeRule | undefined;
  for (const r of sorted) {
    if (amount >= r.minAmount && (r.maxAmount === null || amount < r.maxAmount)) {
      rule = r;
    }
  }
  if (!rule) return 0;
  if (rule.type === 'PERCENTAGE') return Math.round((amount * rule.value) / 100);
  return rule.value;
}

export async function listOutletPaymentMethods(params: {
  businessId: string;
  outletId: string;
  activeOnly?: boolean;
}) {
  const rows = await prisma.outletPaymentMethod.findMany({
    where: {
      businessId: params.businessId,
      outletId: params.outletId,
      ...(params.activeOnly ? { isActive: true } : {}),
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });
  return rows.map(toDto);
}

export async function getOutletPaymentMethodByCode(params: {
  businessId: string;
  outletId: string;
  code: string;
}) {
  return prisma.outletPaymentMethod.findFirst({
    where: {
      businessId: params.businessId,
      outletId: params.outletId,
      code: params.code,
      isActive: true,
    },
  });
}

export async function createOutletPaymentMethod(params: {
  businessId: string;
  outletId: string;
  name: string;
  code: string;
  isActive?: boolean;
  surchargeRules?: SurchargeRule[];
  sortOrder?: number;
}) {
  const outlet = await prisma.outlet.findFirst({
    where: { id: params.outletId, businessId: params.businessId },
    select: { id: true },
  });
  if (!outlet) throw new Error('Outlet tidak ditemukan');

  const row = await prisma.outletPaymentMethod.create({
    data: {
      businessId: params.businessId,
      outletId: params.outletId,
      name: params.name.trim(),
      code: params.code.trim().toUpperCase(),
      isActive: params.isActive ?? true,
      surchargeRules: (params.surchargeRules ?? []) as unknown as Prisma.InputJsonValue,
      sortOrder: params.sortOrder ?? 0,
    },
  });
  return toDto(row);
}

export async function updateOutletPaymentMethod(params: {
  id: string;
  businessId: string;
  outletId: string;
  name?: string;
  isActive?: boolean;
  surchargeRules?: SurchargeRule[];
  sortOrder?: number;
}) {
  const existing = await prisma.outletPaymentMethod.findFirst({
    where: { id: params.id, businessId: params.businessId, outletId: params.outletId },
  });
  if (!existing) throw new Error('Metode pembayaran tidak ditemukan');

  const row = await prisma.outletPaymentMethod.update({
    where: { id: params.id },
    data: {
      ...(params.name !== undefined ? { name: params.name.trim() } : {}),
      ...(params.isActive !== undefined ? { isActive: params.isActive } : {}),
      ...(params.surchargeRules !== undefined
        ? { surchargeRules: params.surchargeRules as unknown as Prisma.InputJsonValue }
        : {}),
      ...(params.sortOrder !== undefined ? { sortOrder: params.sortOrder } : {}),
    },
  });
  return toDto(row);
}

export async function deleteOutletPaymentMethod(params: {
  id: string;
  businessId: string;
  outletId: string;
}) {
  const existing = await prisma.outletPaymentMethod.findFirst({
    where: { id: params.id, businessId: params.businessId, outletId: params.outletId },
  });
  if (!existing) throw new Error('Metode pembayaran tidak ditemukan');
  await prisma.outletPaymentMethod.delete({ where: { id: params.id } });
}

export async function seedDefaultPaymentMethods(params: {
  businessId: string;
  outletId: string;
}) {
  const existing = await prisma.outletPaymentMethod.count({
    where: { businessId: params.businessId, outletId: params.outletId },
  });
  if (existing > 0) return;

  const defaults = [
    { name: 'Cash', code: 'CASH', sortOrder: 0 },
    { name: 'QRIS', code: 'QRIS', sortOrder: 1 },
    { name: 'Transfer', code: 'TRANSFER', sortOrder: 2 },
    { name: 'Card', code: 'CARD', sortOrder: 3 },
  ];

  await prisma.outletPaymentMethod.createMany({
    data: defaults.map((d) => ({
      businessId: params.businessId,
      outletId: params.outletId,
      name: d.name,
      code: d.code,
      isActive: true,
      surchargeRules: [],
      sortOrder: d.sortOrder,
    })),
  });
}

import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma';

export type PosChargeRule = {
  key: string;
  label: string;
  type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  value: number;
  enabled: boolean;
  sortOrder?: number;
};

export type PosRoundingSetting = {
  enabled: boolean;
  method: 'NONE' | 'NEAREST' | 'CEIL' | 'FLOOR';
  unit: number;
};

export async function getOutletPosChargeSettings(outletId: string) {
  const [rules, rounding] = await Promise.all([
    prisma.outletPosChargeRule.findMany({
      where: { outletId },
      orderBy: [{ sortOrder: 'asc' }, { key: 'asc' }],
    }),
    prisma.outletRoundingSetting.findUnique({ where: { outletId } }),
  ]);

  const hasRules = rules.length > 0;

  const normalizedRules: PosChargeRule[] = hasRules
    ? rules.map((r) => ({
        key: r.key,
        label: r.label,
        type: r.type,
        value: Number(r.value),
        enabled: r.enabled,
        sortOrder: r.sortOrder ?? 0,
      }))
    : [
        { key: 'TAX', label: 'Tax', type: 'PERCENTAGE', value: 10, enabled: true, sortOrder: 1 },
        { key: 'SERVICE', label: 'Service', type: 'FIXED_AMOUNT', value: 0, enabled: false, sortOrder: 2 },
      ];

  const normalizedRounding: PosRoundingSetting = rounding
    ? { enabled: rounding.enabled, method: rounding.method, unit: rounding.unit }
    : { enabled: true, method: 'CEIL', unit: 100 };

  return { charges: normalizedRules, rounding: normalizedRounding };
}

export async function putOutletPosChargeSettings(params: {
  businessId: string;
  outletId: string;
  charges: PosChargeRule[];
  rounding: PosRoundingSetting;
}) {
  const { businessId, outletId, charges, rounding } = params;

  await prisma.$transaction(async (tx) => {
    // Upsert rules (cap at 10 for sanity)
    const capped = charges.slice(0, 10);

    for (const [idx, rule] of capped.entries()) {
      await tx.outletPosChargeRule.upsert({
        where: { outletId_key: { outletId, key: rule.key } },
        update: {
          label: rule.label,
          type: rule.type as any,
          value: new Prisma.Decimal(rule.value ?? 0),
          enabled: Boolean(rule.enabled),
          sortOrder: rule.sortOrder ?? idx,
          businessId,
        },
        create: {
          businessId,
          outletId,
          key: rule.key,
          label: rule.label,
          type: rule.type as any,
          value: new Prisma.Decimal(rule.value ?? 0),
          enabled: Boolean(rule.enabled),
          sortOrder: rule.sortOrder ?? idx,
        },
      });
    }

    // Remove leftovers not in the new list
    const keepKeys = new Set(capped.map((r) => r.key));
    await tx.outletPosChargeRule.deleteMany({ where: { outletId, NOT: { key: { in: Array.from(keepKeys) } } } });

    // Upsert rounding
    await tx.outletRoundingSetting.upsert({
      where: { outletId },
      update: {
        method: rounding.method as any,
        unit: Math.max(1, Math.floor(rounding.unit ?? 100)),
        enabled: Boolean(rounding.enabled),
      },
      create: {
        outletId,
        method: rounding.method as any,
        unit: Math.max(1, Math.floor(rounding.unit ?? 100)),
        enabled: Boolean(rounding.enabled),
      },
    });
  });

  return getOutletPosChargeSettings(outletId);
}

export function applyChargesAndRounding(baseTotal: Prisma.Decimal, rules: PosChargeRule[], rounding: PosRoundingSetting) {
  const active = rules.filter((r) => r.enabled);
  const toNumber = (v: Prisma.Decimal) => Number(v.toFixed(2));

  let taxAmount = new Prisma.Decimal(0);
  let serviceAmount = new Prisma.Decimal(0);
  let otherTotal = new Prisma.Decimal(0);

  for (const rule of active) {
    const amount = rule.type === 'PERCENTAGE'
      ? baseTotal.mul(new Prisma.Decimal(rule.value).div(100))
      : new Prisma.Decimal(rule.value);

    if (rule.key.toUpperCase() === 'TAX') taxAmount = taxAmount.plus(amount);
    else if (rule.key.toUpperCase() === 'SERVICE') serviceAmount = serviceAmount.plus(amount);
    else otherTotal = otherTotal.plus(amount);
  }

  const preRound = baseTotal.plus(taxAmount).plus(serviceAmount).plus(otherTotal);

  function roundByMethod(val: number, unit: number, method: 'NONE'|'NEAREST'|'CEIL'|'FLOOR') {
    if (method === 'NONE' || unit <= 1) return val;
    const q = val / unit;
    if (method === 'NEAREST') return Math.round(q) * unit;
    if (method === 'CEIL') return Math.ceil(q) * unit;
    return Math.floor(q) * unit;
  }

  const grand = rounding.enabled
    ? new Prisma.Decimal(roundByMethod(toNumber(preRound), Math.max(1, rounding.unit), rounding.method))
    : preRound;

  return {
    taxAmount,
    serviceChargeAmount: serviceAmount,
    grandTotal: grand,
  };
}

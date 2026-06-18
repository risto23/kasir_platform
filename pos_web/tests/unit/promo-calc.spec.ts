import { describe, expect, it } from 'vitest';
import { calculateCartPromos } from '@/lib/promo-calc';
import type { PosCartItem } from '@/types/pos';
import type { PromoItem } from '@/types/promo';

function cartItem(
  overrides: Partial<PosCartItem> & { lineId: string; basePrice: number; qty: number },
): PosCartItem {
  return {
    lineId: overrides.lineId,
    productId: overrides.productId ?? 'prod-1',
    productName: overrides.productName ?? 'Item',
    productCode: null,
    categoryId: overrides.categoryId ?? null,
    brand: overrides.brand ?? null,
    unit: overrides.unit ?? null,
    note: '',
    qty: overrides.qty,
    basePrice: overrides.basePrice,
    imageUrl: null,
  };
}

function promo(overrides: Partial<PromoItem> & { id: string }): PromoItem {
  return {
    id: overrides.id,
    businessId: 'biz-1',
    name: overrides.name ?? overrides.id,
    description: null,
    targetType: overrides.targetType ?? 'CATEGORY',
    categoryId: overrides.categoryId ?? null,
    productId: overrides.productId ?? null,
    targetTextValue: overrides.targetTextValue ?? null,
    targetLabel: null,
    targetValue: null,
    discountType: overrides.discountType ?? 'PERCENTAGE',
    discountValue: overrides.discountValue ?? '0',
    discountPreview: '',
    minChargeAmount: overrides.minChargeAmount ?? null,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    startTime: '00:00',
    endTime: '23:59',
    status: 'ACTIVE',
    effectiveStatus: 'ACTIVE',
    outletScope: overrides.outletScope ?? 'ALL_OUTLETS',
    selectedOutletCount: 0,
    selectedOutlets: overrides.selectedOutlets ?? [],
    createdAt: '',
    updatedAt: '',
  };
}

describe('calculateCartPromos', () => {
  it('applies no discount when nothing matches ("ga ada")', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'food', basePrice: 10_000, qty: 2 })];
    const promos = [promo({ id: 'p1', categoryId: 'drink', discountValue: '10' })];

    const result = calculateCartPromos(cart, promos);

    expect(result.grossSubtotal).toBe(20_000);
    expect(result.discountTotal).toBe(0);
    expect(result.netSubtotal).toBe(20_000);
  });

  it('applies a single regular percentage promo', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'food', basePrice: 10_000, qty: 2 })];
    const promos = [promo({ id: 'p1', categoryId: 'food', discountValue: '10' })];

    const result = calculateCartPromos(cart, promos);

    expect(result.discountTotal).toBe(2_000); // 10% * 10_000 * 2
    expect(result.netSubtotal).toBe(18_000);
    expect(result.lines.get('l1')?.unitNet).toBe(9_000);
  });

  it('stacks all matching regular promos ("bisa ditumpuk")', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'food', basePrice: 10_000, qty: 1 })];
    const promos = [
      promo({ id: 'p1', categoryId: 'food', discountValue: '10' }),
      promo({ id: 'p2', categoryId: 'food', discountValue: '20' }),
    ];

    const result = calculateCartPromos(cart, promos);

    // 10% + 20% = 30% of 10_000 (stacked, NOT just the largest)
    expect(result.discountTotal).toBe(3_000);
    expect(result.netSubtotal).toBe(7_000);
  });

  it('owner example: 5% drinks + 10% all stack to 15% on a drink', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'drink', basePrice: 20_000, qty: 1 })];
    const promos = [
      promo({ id: 'weekend', categoryId: 'drink', discountValue: '5' }),
      promo({ id: 'owner', categoryId: 'drink', discountValue: '10' }),
    ];

    const result = calculateCartPromos(cart, promos);

    expect(result.discountTotal).toBe(3_000); // 15% of 20_000
    expect(result.netSubtotal).toBe(17_000);
  });

  it('caps the stacked discount at the unit price', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'food', basePrice: 10_000, qty: 1 })];
    const promos = [
      promo({ id: 'a', categoryId: 'food', discountValue: '60' }),
      promo({ id: 'b', categoryId: 'food', discountValue: '60' }),
    ];

    const result = calculateCartPromos(cart, promos);

    // 60% + 60% = 120% -> capped at 100%
    expect(result.discountTotal).toBe(10_000);
    expect(result.netSubtotal).toBe(0);
  });

  it('does NOT apply a min-charge promo below its threshold', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'food', basePrice: 10_000, qty: 5 })];
    const promos = [
      promo({ id: 'reg', categoryId: 'food', discountValue: '10' }),
      promo({ id: 'min', categoryId: 'food', discountValue: '5', minChargeAmount: '100000' }),
    ];

    // qualifying gross = 50_000 < 100_000 -> only the 10% regular promo applies
    const result = calculateCartPromos(cart, promos);

    expect(result.discountTotal).toBe(5_000); // 10% * 10_000 * 5
  });

  it('stacks a min-charge promo on top of the regular promo once the threshold is met ("bisa ditumpuk")', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'food', basePrice: 10_000, qty: 12 })];
    const promos = [
      promo({ id: 'reg', categoryId: 'food', discountValue: '10' }),
      promo({ id: 'min', categoryId: 'food', discountValue: '5', minChargeAmount: '100000' }),
    ];

    // qualifying gross = 120_000 >= 100_000 -> 10% + 5% = 1_500 per unit
    const result = calculateCartPromos(cart, promos);

    expect(result.discountTotal).toBe(18_000); // 1_500 * 12
    expect(result.netSubtotal).toBe(102_000);
  });

  it('caps a fixed-amount discount at the unit price', () => {
    const cart = [cartItem({ lineId: 'l1', categoryId: 'food', basePrice: 10_000, qty: 1 })];
    const promos = [
      promo({ id: 'p1', categoryId: 'food', discountType: 'FIXED_AMOUNT', discountValue: '15000' }),
    ];

    const result = calculateCartPromos(cart, promos);

    expect(result.discountTotal).toBe(10_000); // capped, not 15_000
    expect(result.netSubtotal).toBe(0);
  });
});

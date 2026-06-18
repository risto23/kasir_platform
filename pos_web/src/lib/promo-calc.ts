import type { PosCartItem } from '@/types/pos';
import type { PromoItem } from '@/types/promo';

export type CartPromoLineResult = {
  lineId: string;
  unitPrice: number;
  unitDiscount: number;
  unitNet: number;
  lineGross: number;
  lineDiscount: number;
  lineNet: number;
};

export type CartPromoResult = {
  lines: Map<string, CartPromoLineResult>;
  grossSubtotal: number;
  discountTotal: number;
  netSubtotal: number;
};

function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') {
    return 0;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase();
  return normalized && normalized.length > 0 ? normalized : null;
}

// Mirror of order.service.isPromoMatchingProductData
function promoMatchesItem(promo: PromoItem, item: PosCartItem): boolean {
  switch (promo.targetType) {
    case 'CATEGORY':
      return promo.categoryId !== null && promo.categoryId === item.categoryId;
    case 'PRODUCT':
      return promo.productId !== null && promo.productId === item.productId;
    case 'PRODUCT_NAME':
      return normalizeText(promo.targetTextValue) === normalizeText(item.productName);
    case 'BRAND':
      return normalizeText(promo.targetTextValue) === normalizeText(item.brand);
    case 'UNIT':
      return normalizeText(promo.targetTextValue) === normalizeText(item.unit);
    default:
      return false;
  }
}

function unitDiscountFor(promo: PromoItem, unitPrice: number): number {
  const value = toNumber(promo.discountValue);
  const raw = promo.discountType === 'PERCENTAGE' ? (unitPrice * value) / 100 : value;
  return raw > unitPrice ? unitPrice : raw;
}

/**
 * Client-side mirror of order.service.recalculateAllDiscountsAndTotals so the
 * cart preview matches the order/receipt totals exactly:
 *   pass 1 — stack ALL matching regular promos (minChargeAmount == null) per item
 *   pass 2 — min-charge promos stacked on top when the matching gross subtotal
 *            meets the threshold (multiple min-charge promos accumulate)
 * the combined per-unit discount is capped at the unit price.
 *
 * `promos` MUST already be filtered to active + eligible for the active outlet
 * (effectiveStatus ACTIVE + outlet scope); schedule/timezone eligibility is
 * resolved server-side so it is not re-implemented here.
 */
export function calculateCartPromos(
  cart: PosCartItem[],
  promos: PromoItem[],
): CartPromoResult {
  const regularPromos = promos.filter((promo) => promo.minChargeAmount == null);
  const minChargePromos = promos.filter((promo) => promo.minChargeAmount != null);

  // Pass 1: stack all matching regular promos per item.
  const regularUnitDiscount = new Map<string, number>();
  for (const item of cart) {
    const unitPrice = toNumber(item.basePrice);
    let regular = 0;
    for (const promo of regularPromos) {
      if (!promoMatchesItem(promo, item)) continue;
      regular += unitDiscountFor(promo, unitPrice);
    }
    regularUnitDiscount.set(item.lineId, regular);
  }

  // Pass 2: min-charge promos stack when their qualifying gross subtotal qualifies.
  const additionalUnitDiscount = new Map<string, number>();
  for (const promo of minChargePromos) {
    const matching = cart.filter((item) => promoMatchesItem(promo, item));
    const qualifyingSubtotal = matching.reduce(
      (sum, item) => sum + toNumber(item.basePrice) * item.qty,
      0,
    );
    if (qualifyingSubtotal < toNumber(promo.minChargeAmount)) continue;
    for (const item of matching) {
      const additional = unitDiscountFor(promo, toNumber(item.basePrice));
      additionalUnitDiscount.set(
        item.lineId,
        (additionalUnitDiscount.get(item.lineId) ?? 0) + additional,
      );
    }
  }

  const lines = new Map<string, CartPromoLineResult>();
  let grossSubtotal = 0;
  let discountTotal = 0;

  for (const item of cart) {
    const unitPrice = toNumber(item.basePrice);
    const combined =
      (regularUnitDiscount.get(item.lineId) ?? 0) +
      (additionalUnitDiscount.get(item.lineId) ?? 0);
    const unitDiscount = combined > unitPrice ? unitPrice : combined;

    const lineGross = unitPrice * item.qty;
    const lineDiscount = unitDiscount * item.qty;
    const lineNet = lineGross - lineDiscount;

    lines.set(item.lineId, {
      lineId: item.lineId,
      unitPrice,
      unitDiscount,
      unitNet: unitPrice - unitDiscount,
      lineGross,
      lineDiscount,
      lineNet,
    });

    grossSubtotal += lineGross;
    discountTotal += lineDiscount;
  }

  return {
    lines,
    grossSubtotal,
    discountTotal,
    netSubtotal: grossSubtotal - discountTotal,
  };
}

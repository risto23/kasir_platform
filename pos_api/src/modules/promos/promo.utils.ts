import {
  PromoDiscountType,
  PromoStatus,
  PromoTargetType,
} from '@prisma/client';
import type { PromoEffectiveStatus } from './promo.types';

type PromoScheduleSource = {
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  status: PromoStatus;
};

export function normalizeDateOnlyInput(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getJakartaNowParts() {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(new Date());

  const year = parts.find((item) => item.type === 'year')?.value ?? '0000';
  const month = parts.find((item) => item.type === 'month')?.value ?? '00';
  const day = parts.find((item) => item.type === 'day')?.value ?? '00';
  const hour = parts.find((item) => item.type === 'hour')?.value ?? '00';
  const minute = parts.find((item) => item.type === 'minute')?.value ?? '00';

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  };
}

export function resolvePromoEffectiveStatus(
  promo: PromoScheduleSource,
): PromoEffectiveStatus {
  if (promo.status === PromoStatus.INACTIVE) {
    return 'INACTIVE';
  }

  const now = getJakartaNowParts();
  const startDate = formatDateOnly(promo.startDate);
  const endDate = formatDateOnly(promo.endDate);

  if (
    now.date < startDate ||
    (now.date === startDate && now.time < promo.startTime)
  ) {
    return 'SCHEDULED';
  }

  if (
    now.date > endDate ||
    (now.date === endDate && now.time > promo.endTime)
  ) {
    return 'EXPIRED';
  }

  return 'ACTIVE';
}

export function buildPromoTargetLabel(input: {
  targetType: PromoTargetType;
  categoryName?: string | null;
  productName?: string | null;
  targetTextValue?: string | null;
}): string | null {
  if (input.targetType === PromoTargetType.CATEGORY) {
    return input.categoryName ?? null;
  }

  if (input.targetType === PromoTargetType.PRODUCT) {
    return input.productName ?? null;
  }

  return input.targetTextValue ?? null;
}

export function buildPromoTargetValue(input: {
  targetType: PromoTargetType;
  categoryId?: string | null;
  productId?: string | null;
  targetTextValue?: string | null;
}): string | null {
  if (input.targetType === PromoTargetType.CATEGORY) {
    return input.categoryId ?? null;
  }

  if (input.targetType === PromoTargetType.PRODUCT) {
    return input.productId ?? null;
  }

  return input.targetTextValue ?? null;
}

export function mapDiscountPreview(
  discountType: PromoDiscountType,
  discountValue: string,
): string {
  if (discountType === PromoDiscountType.PERCENTAGE) {
    return `${discountValue}%`;
  }

  return `Rp ${discountValue}`;
}
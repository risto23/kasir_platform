import { ProductOutletStatus } from '@prisma/client';

import type {
  ProductOutletSettingsListQuery,
  ProductOutletSettingsParams,
  UpdateProductOutletSettingInput,
} from './product-outlet-settings.types';

type RawRecord = Record<string, unknown>;

function asRecord(value: unknown): RawRecord {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as RawRecord;
  }

  return {};
}

function asTrimmedString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}

function asNullableNumber(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw createValidationError('priceOverride harus berupa angka atau null.');
}

function asBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();

    if (lowered === 'true') {
      return true;
    }

    if (lowered === 'false') {
      return false;
    }
  }

  return undefined;
}

function asProductOutletStatus(value: unknown): ProductOutletStatus | undefined {
  const raw = asTrimmedString(value);

  if (!raw) {
    return undefined;
  }

  if (raw === ProductOutletStatus.ACTIVE || raw === ProductOutletStatus.INACTIVE) {
    return raw;
  }

  throw createValidationError('status product outlet tidak valid.');
}

function requireId(value: unknown, fieldName: string): string {
  const parsed = asTrimmedString(value);

  if (!parsed) {
    throw createValidationError(`${fieldName} wajib diisi.`);
  }

  return parsed;
}

function createValidationError(message: string) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = 400;
  return error;
}

export function parseProductOutletSettingsListQuery(
  rawValue: unknown,
): ProductOutletSettingsListQuery {
  const raw = asRecord(rawValue);

  return {
    page: asPositiveInt(raw.page, 1),
    limit: Math.min(asPositiveInt(raw.limit, 20), 100),
    search: asTrimmedString(raw.search),
    productId: asTrimmedString(raw.productId),
    outletId: asTrimmedString(raw.outletId),
    status: asProductOutletStatus(raw.status),
    isAvailable: asBoolean(raw.isAvailable),
  };
}

export function parseProductOutletSettingsParams(
  rawValue: unknown,
): ProductOutletSettingsParams {
  const raw = asRecord(rawValue);

  return {
    productId: requireId(raw.productId, 'productId'),
    outletId: requireId(raw.outletId, 'outletId'),
  };
}

export function parseProductOutletSettingsProductParams(
  rawValue: unknown,
): Pick<ProductOutletSettingsParams, 'productId'> {
  const raw = asRecord(rawValue);

  return {
    productId: requireId(raw.productId, 'productId'),
  };
}

export function parseUpdateProductOutletSettingBody(
  rawValue: unknown,
): UpdateProductOutletSettingInput {
  const raw = asRecord(rawValue);

  const status = asProductOutletStatus(raw.status);
  const isAvailable = asBoolean(raw.isAvailable);
  const priceOverride = asNullableNumber(raw.priceOverride);

  if (
    status === undefined &&
    isAvailable === undefined &&
    priceOverride === undefined
  ) {
    throw createValidationError(
      'Minimal salah satu field status, isAvailable, atau priceOverride wajib dikirim.',
    );
  }

  if (priceOverride !== undefined && priceOverride !== null && priceOverride < 0) {
    throw createValidationError('priceOverride tidak boleh negatif.');
  }

  return {
    status,
    isAvailable,
    priceOverride,
  };
}
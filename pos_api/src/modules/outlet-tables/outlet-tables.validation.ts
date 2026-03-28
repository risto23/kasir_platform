import { OutletTableStatus } from '@prisma/client';

import type {
  CreateOutletTableInput,
  OutletIdParams,
  OutletTableIdParams,
  OutletTablesListQuery,
  UpdateOutletTableInput,
  UpdateOutletTableStatusInput,
} from './outlet-tables.types';

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

function asNullableCapacity(value: unknown): number | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  throw createValidationError('capacity harus berupa bilangan bulat positif atau null.');
}

function asOutletTableStatus(value: unknown): OutletTableStatus | undefined {
  const raw = asTrimmedString(value);

  if (!raw) {
    return undefined;
  }

  if (raw === OutletTableStatus.ACTIVE || raw === OutletTableStatus.INACTIVE) {
    return raw;
  }

  throw createValidationError('status meja tidak valid.');
}

function requireString(value: unknown, fieldName: string): string {
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

export function parseOutletIdParams(rawValue: unknown): OutletIdParams {
  const raw = asRecord(rawValue);

  return {
    outletId: requireString(raw.outletId, 'outletId'),
  };
}

export function parseOutletTableIdParams(rawValue: unknown): OutletTableIdParams {
  const raw = asRecord(rawValue);

  return {
    outletId: requireString(raw.outletId, 'outletId'),
    id: requireString(raw.id, 'id'),
  };
}

export function parseOutletTablesListQuery(rawValue: unknown): OutletTablesListQuery {
  const raw = asRecord(rawValue);

  return {
    page: asPositiveInt(raw.page, 1),
    limit: Math.min(asPositiveInt(raw.limit, 20), 100),
    search: asTrimmedString(raw.search),
    status: asOutletTableStatus(raw.status),
  };
}

export function parseCreateOutletTableBody(rawValue: unknown): CreateOutletTableInput {
  const raw = asRecord(rawValue);

  return {
    code: requireString(raw.code, 'code'),
    name: requireString(raw.name, 'name'),
    capacity: asNullableCapacity(raw.capacity),
    status: asOutletTableStatus(raw.status),
  };
}

export function parseUpdateOutletTableBody(rawValue: unknown): UpdateOutletTableInput {
  const raw = asRecord(rawValue);

  const code = asTrimmedString(raw.code);
  const name = asTrimmedString(raw.name);
  const capacity = asNullableCapacity(raw.capacity);
  const status = asOutletTableStatus(raw.status);

  if (
    code === undefined &&
    name === undefined &&
    capacity === undefined &&
    status === undefined
  ) {
    throw createValidationError(
      'Minimal salah satu field code, name, capacity, atau status wajib dikirim.',
    );
  }

  return {
    code,
    name,
    capacity,
    status,
  };
}

export function parseUpdateOutletTableStatusBody(
  rawValue: unknown,
): UpdateOutletTableStatusInput {
  const raw = asRecord(rawValue);
  const status = asOutletTableStatus(raw.status);

  if (!status) {
    throw createValidationError('status wajib diisi.');
  }

  return { status };
}
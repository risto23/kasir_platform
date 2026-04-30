import { Prisma, SupplierStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  CreateSupplierBody,
  SupplierListQuery,
  SupplierParams,
  UpdateSupplierBody,
  UpdateSupplierStatusBody,
} from './suppliers.types';

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

function sanitizeSearch(search?: string) {
  const trimmed = search?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function normalizeCode(code?: string | null) {
  if (!code) {
    return null;
  }

  return code.trim().toUpperCase();
}

function normalizeName(name: string) {
  return name.trim();
}

function normalizeNullableText(value?: string | null) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeNullableEmail(value?: string | null) {
  const normalized = normalizeNullableText(value);
  return normalized ? normalized.toLowerCase() : null;
}

function slugifySupplierName(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

async function ensureSupplierExists(businessId: string, supplierId: string) {
  const supplier = await prisma.supplier.findFirst({
    where: {
      id: supplierId,
      businessId,
    },
  });

  if (!supplier) {
    throw createHttpError('Supplier tidak ditemukan.', 404);
  }

  return supplier;
}

async function ensureSupplierNameUnique(
  businessId: string,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.supplier.findFirst({
    where: {
      businessId,
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
      name: {
        equals: name,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('Nama supplier sudah digunakan di business ini.', 409);
  }
}

async function ensureSupplierCodeUnique(
  businessId: string,
  code: string,
  excludeId?: string,
) {
  const existing = await prisma.supplier.findFirst({
    where: {
      businessId,
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
      code: {
        equals: code,
        mode: 'insensitive',
      },
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw createHttpError('Code supplier sudah digunakan di business ini.', 409);
  }
}

async function generateSupplierCode(businessId: string, supplierName: string) {
  const baseSlug = slugifySupplierName(supplierName) || 'SUPPLIER';

  for (let index = 1; index <= 9999; index += 1) {
    const candidate = `SUP-${baseSlug}-${String(index).padStart(3, '0')}`;

    const exists = await prisma.supplier.findFirst({
      where: {
        businessId,
        code: candidate,
      },
      select: {
        id: true,
      },
    });

    if (!exists) {
      return candidate;
    }
  }

  throw createHttpError('Gagal generate code supplier.', 500);
}

function buildSupplierMutationData(
  payload: CreateSupplierBody | UpdateSupplierBody,
  code: string,
) {
  return {
    code,
    name: normalizeName(payload.name),
    phone: normalizeNullableText(payload.phone),
    email: normalizeNullableEmail(payload.email),
    address: normalizeNullableText(payload.address),
    paymentTermDays: payload.paymentTermDays ?? null,
    taxNumber: normalizeNullableText(payload.taxNumber),
    notes: normalizeNullableText(payload.notes),
    leadTimeDays: payload.leadTimeDays ?? null,
    isPreferred: payload.isPreferred ?? false,
  };
}

export async function listSuppliers(
  businessId: string,
  query: SupplierListQuery,
) {
  const search = sanitizeSearch(query.search);

  const where: Prisma.SupplierWhereInput = {
    businessId,
    ...(query.status
      ? {
          status: query.status as SupplierStatus,
        }
      : {}),
    ...(query.isPreferred !== undefined
      ? {
          isPreferred: query.isPreferred,
        }
      : {}),
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              code: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              phone: {
                contains: search,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  const skip = (query.page - 1) * query.perPage;

  const [items, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      skip,
      take: query.perPage,
      orderBy: [{ isPreferred: 'desc' }, { name: 'asc' }],
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    items,
    meta: {
      page: query.page,
      perPage: query.perPage,
      total,
      totalPages: Math.ceil(total / query.perPage) || 1,
    },
  };
}

export async function getSupplierDetail(
  businessId: string,
  params: SupplierParams,
) {
  return ensureSupplierExists(businessId, params.id);
}

export async function createSupplier(
  businessId: string,
  payload: CreateSupplierBody,
) {
  const normalizedName = normalizeName(payload.name);
  const requestedCode = normalizeCode(payload.code);
  const supplierCode =
    requestedCode ?? (await generateSupplierCode(businessId, normalizedName));

  await ensureSupplierNameUnique(businessId, normalizedName);
  await ensureSupplierCodeUnique(businessId, supplierCode);

  return prisma.supplier.create({
    data: {
      businessId,
      ...buildSupplierMutationData(payload, supplierCode),
    },
  });
}

export async function updateSupplier(
  businessId: string,
  params: SupplierParams,
  payload: UpdateSupplierBody,
) {
  const existing = await ensureSupplierExists(businessId, params.id);
  const normalizedName = normalizeName(payload.name);
  const requestedCode = normalizeCode(payload.code);
  const supplierCode = requestedCode ?? existing.code;

  await ensureSupplierNameUnique(businessId, normalizedName, params.id);
  await ensureSupplierCodeUnique(businessId, supplierCode, params.id);

  return prisma.supplier.update({
    where: {
      id: params.id,
    },
    data: buildSupplierMutationData(payload, supplierCode),
  });
}

export async function updateSupplierStatus(
  businessId: string,
  params: SupplierParams,
  payload: UpdateSupplierStatusBody,
) {
  await ensureSupplierExists(businessId, params.id);

  return prisma.supplier.update({
    where: {
      id: params.id,
    },
    data: {
      status: payload.status,
    },
  });
}

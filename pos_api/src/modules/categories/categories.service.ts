import { Prisma, CategoryStatus } from '@prisma/client';
import { prisma } from '../../config/prisma';
import type {
  CategoryListQuery,
  CategoryParams,
  CreateCategoryBody,
  UpdateCategoryBody,
  UpdateCategoryStatusBody,
} from './categories.types';

function normalizeCode(code?: string | null) {
  if (!code) {
    return null;
  }

  return code.trim().toUpperCase();
}

function normalizeName(name: string) {
  return name.trim();
}

function normalizeDescription(description?: string | null) {
  if (!description) {
    return null;
  }

  const trimmed = description.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeSearch(search?: string) {
  const trimmed = search?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}

function createHttpError(message: string, statusCode: number) {
  const error = new Error(message) as Error & { statusCode?: number };
  error.statusCode = statusCode;
  return error;
}

async function ensureCategoryExists(businessId: string, categoryId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      businessId,
    },
  });

  if (!category) {
    throw createHttpError('Kategori tidak ditemukan.', 404);
  }

  return category;
}

async function ensureCategoryNameUnique(
  businessId: string,
  name: string,
  excludeId?: string,
) {
  const existing = await prisma.category.findFirst({
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
    throw createHttpError('Nama kategori sudah digunakan di business ini.', 409);
  }
}

async function ensureCategoryCodeUnique(
  businessId: string,
  code?: string | null,
  excludeId?: string,
) {
  if (!code) {
    return;
  }

  const existing = await prisma.category.findFirst({
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
    throw createHttpError('Code kategori sudah digunakan di business ini.', 409);
  }
}

export async function listCategories(
  businessId: string,
  query: CategoryListQuery,
) {
  const search = sanitizeSearch(query.search);

  const where: Prisma.CategoryWhereInput = {
    businessId,
    ...(query.status
      ? {
          status: query.status as CategoryStatus,
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
              description: {
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
    prisma.category.findMany({
      where,
      skip,
      take: query.perPage,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    }),
    prisma.category.count({ where }),
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

export async function getCategoryDetail(
  businessId: string,
  params: CategoryParams,
) {
  return ensureCategoryExists(businessId, params.id);
}

export async function createCategory(
  businessId: string,
  payload: CreateCategoryBody,
) {
  const normalizedName = normalizeName(payload.name);
  const normalizedCode = normalizeCode(payload.code);
  const normalizedDescription = normalizeDescription(payload.description);

  await ensureCategoryNameUnique(businessId, normalizedName);
  await ensureCategoryCodeUnique(businessId, normalizedCode);

  return prisma.category.create({
    data: {
      businessId,
      name: normalizedName,
      code: normalizedCode,
      description: normalizedDescription,
      sortOrder: payload.sortOrder ?? 0,
    },
  });
}

export async function updateCategory(
  businessId: string,
  params: CategoryParams,
  payload: UpdateCategoryBody,
) {
  await ensureCategoryExists(businessId, params.id);

  const normalizedName = normalizeName(payload.name);
  const normalizedCode = normalizeCode(payload.code);
  const normalizedDescription = normalizeDescription(payload.description);

  await ensureCategoryNameUnique(businessId, normalizedName, params.id);
  await ensureCategoryCodeUnique(businessId, normalizedCode, params.id);

  return prisma.category.update({
    where: {
      id: params.id,
    },
    data: {
      name: normalizedName,
      code: normalizedCode,
      description: normalizedDescription,
      sortOrder: payload.sortOrder ?? 0,
    },
  });
}

export async function updateCategoryStatus(
  businessId: string,
  params: CategoryParams,
  payload: UpdateCategoryStatusBody,
) {
  await ensureCategoryExists(businessId, params.id);

  return prisma.category.update({
    where: {
      id: params.id,
    },
    data: {
      status: payload.status,
    },
  });
}
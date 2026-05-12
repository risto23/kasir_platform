import { Prisma, BusinessType, OrderStatus, OrderType, PaymentStatus } from '@prisma/client';

import {prisma} from '../../config/prisma';

import type {
  CreateOutletTableInput,
  OutletTableListItem,
  OutletTablesListQuery,
  OutletTablesListResponse,
  TableOccupancyItem,
  UpdateOutletTableInput,
} from './outlet-tables.types';

class HttpError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

function mapTable(row: {
  id: string;
  outletId: string;
  code: string;
  name: string;
  capacity: number | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): OutletTableListItem {
  return {
    id: row.id,
    outletId: row.outletId,
    code: row.code,
    name: row.name,
    capacity: row.capacity,
    status: row.status as OutletTableListItem['status'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function ensureRestaurantOutlet(businessId: string, outletId: string) {
  const outlet = await prisma.outlet.findFirst({
    where: {
      id: outletId,
      businessId,
    },
    select: {
      id: true,
      businessId: true,
      name: true,
      code: true,
      status: true,
      business: {
        select: {
          id: true,
          businessType: true,
          status: true,
        },
      },
    },
  });

  if (!outlet) {
    throw new HttpError(404, 'Outlet tidak ditemukan pada business aktif.');
  }

  if (outlet.business.businessType !== BusinessType.RESTAURANT) {
    throw new HttpError(403, 'Fitur meja hanya untuk business type RESTAURANT.');
  }

  return outlet;
}

async function ensureOutletTableBelongsToOutlet(
  businessId: string,
  outletId: string,
  tableId: string,
) {
  await ensureRestaurantOutlet(businessId, outletId);

  const table = await prisma.outletTable.findFirst({
    where: {
      id: tableId,
      outletId,
      outlet: {
        businessId,
      },
    },
  });

  if (!table) {
    throw new HttpError(404, 'Meja outlet tidak ditemukan.');
  }

  return table;
}

export async function listOutletTables(
  businessId: string,
  outletId: string,
  query: OutletTablesListQuery,
): Promise<OutletTablesListResponse> {
  await ensureRestaurantOutlet(businessId, outletId);

  const page = query.page;
  const limit = query.limit;
  const skip = (page - 1) * limit;

  const where: Prisma.OutletTableWhereInput = {
    outletId,
    outlet: {
      businessId,
    },
  };

  if (query.status) {
    where.status = query.status;
  }

  if (query.search) {
    where.OR = [
      {
        code: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
      {
        name: {
          contains: query.search,
          mode: 'insensitive',
        },
      },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.outletTable.count({ where }),
    prisma.outletTable.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ code: 'asc' }, { name: 'asc' }],
    }),
  ]);

  return {
    items: rows.map(mapTable),
    meta: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}

export async function getOutletTableById(
  businessId: string,
  outletId: string,
  tableId: string,
) {
  const table = await ensureOutletTableBelongsToOutlet(businessId, outletId, tableId);
  return mapTable(table);
}

export async function createOutletTable(
  businessId: string,
  outletId: string,
  payload: CreateOutletTableInput,
) {
  await ensureRestaurantOutlet(businessId, outletId);

  const codeExists = await prisma.outletTable.findFirst({
    where: {
      outletId,
      code: payload.code,
    },
    select: { id: true },
  });

  if (codeExists) {
    throw new HttpError(409, 'Code meja sudah dipakai pada outlet ini.');
  }

  const nameExists = await prisma.outletTable.findFirst({
    where: {
      outletId,
      name: payload.name,
    },
    select: { id: true },
  });

  if (nameExists) {
    throw new HttpError(409, 'Nama meja sudah dipakai pada outlet ini.');
  }

  const created = await prisma.outletTable.create({
    data: {
      outletId,
      code: payload.code,
      name: payload.name,
      capacity: payload.capacity ?? null,
      status: payload.status ?? 'ACTIVE',
    },
  });

  return mapTable(created);
}

export async function listTableOccupancy(
  businessId: string,
  outletId: string,
): Promise<TableOccupancyItem[]> {
  await ensureRestaurantOutlet(businessId, outletId);

  const tables = await prisma.outletTable.findMany({
    where: {
      outletId,
      status: 'ACTIVE',
    },
    include: {
      orders: {
        where: {
          orderType: OrderType.DINE_IN,
          status: {
            in: [
              OrderStatus.DRAFT,
              OrderStatus.SUBMITTED,
              OrderStatus.IN_PROGRESS,
              OrderStatus.READY,
            ],
          },
          paymentStatus: PaymentStatus.UNPAID,
        },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          totalAmount: true,
          customerName: true,
          submittedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
      },
    },
    orderBy: [{ code: 'asc' }, { name: 'asc' }],
  });

  return tables.map((table) => {
    const activeOrder = table.orders[0] ?? null;
    return {
      ...mapTable(table),
      isOccupied: activeOrder !== null,
      activeOrder: activeOrder
        ? {
            id: activeOrder.id,
            orderNumber: activeOrder.orderNumber,
            status: activeOrder.status,
            paymentStatus: activeOrder.paymentStatus,
            totalAmount: activeOrder.totalAmount.toFixed(2),
            customerName: activeOrder.customerName,
            submittedAt: activeOrder.submittedAt?.toISOString() ?? null,
          }
        : null,
    };
  });
}

export async function updateOutletTable(
  businessId: string,
  outletId: string,
  tableId: string,
  payload: UpdateOutletTableInput,
) {
  const current = await ensureOutletTableBelongsToOutlet(businessId, outletId, tableId);

  if (payload.code && payload.code !== current.code) {
    const codeExists = await prisma.outletTable.findFirst({
      where: {
        outletId,
        code: payload.code,
        NOT: {
          id: tableId,
        },
      },
      select: { id: true },
    });

    if (codeExists) {
      throw new HttpError(409, 'Code meja sudah dipakai pada outlet ini.');
    }
  }

  if (payload.name && payload.name !== current.name) {
    const nameExists = await prisma.outletTable.findFirst({
      where: {
        outletId,
        name: payload.name,
        NOT: {
          id: tableId,
        },
      },
      select: { id: true },
    });

    if (nameExists) {
      throw new HttpError(409, 'Nama meja sudah dipakai pada outlet ini.');
    }
  }

  const updated = await prisma.outletTable.update({
    where: {
      id: tableId,
    },
    data: {
      code: payload.code,
      name: payload.name,
      capacity: payload.capacity,
      status: payload.status,
    },
  });

  return mapTable(updated);
}
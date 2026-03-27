import { prisma } from '../../config/prisma';
import { OutletStatus } from '@prisma/client';

export async function listOutletsService() {
  return prisma.outlet.findMany({
    include: {
      business: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getOutletByIdService(id: string) {
  const outlet = await prisma.outlet.findUnique({
    where: { id },
    include: {
      business: true,
    },
  });

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan');
  }

  return outlet;
}

export async function createOutletService(payload: {
  businessId: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { id: payload.businessId },
  });

  if (!business) {
    throw new Error('Business tidak ditemukan');
  }

  return prisma.outlet.create({
    data: {
      businessId: payload.businessId,
      name: payload.name,
      code: payload.code,
      address: payload.address,
      phone: payload.phone,
    },
    include: {
      business: true,
    },
  });
}

export async function updateOutletService(
  id: string,
  payload: {
    name: string;
    code: string;
    address?: string | null;
    phone?: string | null;
  }
) {
  const existing = await prisma.outlet.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Outlet tidak ditemukan');
  }

  await prisma.outlet.update({
    where: { id },
    data: {
      name: payload.name,
      code: payload.code,
      address: payload.address ?? null,
      phone: payload.phone ?? null,
    },
  });

  return getOutletByIdService(id);
}

export async function updateOutletStatusService(
  id: string,
  status: OutletStatus
) {
  const existing = await prisma.outlet.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error('Outlet tidak ditemukan');
  }

  await prisma.outlet.update({
    where: { id },
    data: { status },
  });

  return getOutletByIdService(id);
}
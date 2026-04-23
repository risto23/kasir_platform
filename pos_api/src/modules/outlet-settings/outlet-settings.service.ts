import { prisma } from '../../config/prisma';

export type OutletSettingsPayload = {
  outletName: string;
  guestQrEnabled: boolean;
  contactEmail: string | null;
  whatsappNumber: string | null;
  mapsUrl: string | null;
  notes: string | null;
};

export async function getOutletSettings(outletId: string) {
  const [outlet, setting] = await Promise.all([
    prisma.outlet.findUnique({
      where: { id: outletId },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
        phone: true,
        status: true,
      },
    }),
    prisma.outletSetting.findUnique({
      where: { outletId },
    }),
  ]);

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan');
  }

  return {
    outletName: outlet.name,
    guestQrEnabled: setting?.guestQrEnabled ?? true,
    contactEmail: setting?.contactEmail ?? null,
    whatsappNumber: setting?.whatsappNumber ?? null,
    mapsUrl: setting?.mapsUrl ?? null,
    notes: setting?.notes ?? null,
    defaults: {
      outletName: outlet.name,
      outletCode: outlet.code,
      address: outlet.address ?? null,
      phone: outlet.phone ?? null,
      status: outlet.status,
    },
  };
}

export async function putOutletSettings(params: {
  outletId: string;
  payload: OutletSettingsPayload;
}) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: params.outletId },
    select: { id: true, name: true },
  });

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan');
  }

  const nextOutletName = params.payload.outletName.trim() || outlet.name;

  await prisma.outlet.update({
    where: { id: params.outletId },
    data: {
      name: nextOutletName,
    },
  });

  await prisma.outletSetting.upsert({
    where: { outletId: params.outletId },
    update: {
      guestQrEnabled: params.payload.guestQrEnabled,
      contactEmail: params.payload.contactEmail,
      whatsappNumber: params.payload.whatsappNumber,
      mapsUrl: params.payload.mapsUrl,
      notes: params.payload.notes,
    },
    create: {
      outletId: params.outletId,
      guestQrEnabled: params.payload.guestQrEnabled,
      contactEmail: params.payload.contactEmail,
      whatsappNumber: params.payload.whatsappNumber,
      mapsUrl: params.payload.mapsUrl,
      notes: params.payload.notes,
    },
  });

  return getOutletSettings(params.outletId);
}

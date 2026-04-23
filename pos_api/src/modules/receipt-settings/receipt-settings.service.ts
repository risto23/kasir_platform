import { prisma } from '../../config/prisma';

export type OutletReceiptSettingPayload = {
  brandName: string | null;
  logoUrl: string | null;
  headerText: string | null;
  footerText: string | null;
  showBusinessName: boolean;
  showOutletName: boolean;
  showOutletAddress: boolean;
  showOutletPhone: boolean;
};

export async function getOutletReceiptSettings(outletId: string) {
  const [outlet, setting] = await Promise.all([
    prisma.outlet.findUnique({
      where: { id: outletId },
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        business: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.outletReceiptSetting.findUnique({
      where: { outletId },
    }),
  ]);

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan');
  }

  return {
    brandName: setting?.brandName ?? outlet.name,
    logoUrl: setting?.logoUrl ?? null,
    headerText: setting?.headerText ?? null,
    footerText:
      setting?.footerText ?? 'Terima kasih. Simpan struk ini sebagai bukti transaksi.',
    showBusinessName: setting?.showBusinessName ?? true,
    showOutletName: setting?.showOutletName ?? true,
    showOutletAddress: setting?.showOutletAddress ?? true,
    showOutletPhone: setting?.showOutletPhone ?? true,
    defaults: {
      businessName: outlet.business.name,
      outletName: outlet.name,
      outletAddress: outlet.address ?? null,
      outletPhone: outlet.phone ?? null,
    },
  };
}

export async function putOutletReceiptSettings(params: {
  outletId: string;
  payload: OutletReceiptSettingPayload;
}) {
  const outlet = await prisma.outlet.findUnique({
    where: { id: params.outletId },
    select: { id: true },
  });

  if (!outlet) {
    throw new Error('Outlet tidak ditemukan');
  }

  await prisma.outletReceiptSetting.upsert({
    where: { outletId: params.outletId },
    update: {
      brandName: params.payload.brandName,
      logoUrl: params.payload.logoUrl,
      headerText: params.payload.headerText,
      footerText: params.payload.footerText,
      showBusinessName: params.payload.showBusinessName,
      showOutletName: params.payload.showOutletName,
      showOutletAddress: params.payload.showOutletAddress,
      showOutletPhone: params.payload.showOutletPhone,
    },
    create: {
      outletId: params.outletId,
      brandName: params.payload.brandName,
      logoUrl: params.payload.logoUrl,
      headerText: params.payload.headerText,
      footerText: params.payload.footerText,
      showBusinessName: params.payload.showBusinessName,
      showOutletName: params.payload.showOutletName,
      showOutletAddress: params.payload.showOutletAddress,
      showOutletPhone: params.payload.showOutletPhone,
    },
  });

  return getOutletReceiptSettings(params.outletId);
}

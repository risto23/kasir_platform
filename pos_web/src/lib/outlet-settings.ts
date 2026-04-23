import { api } from '@/lib/api';

export type OutletSettingsResponse = {
  outletName: string;
  guestQrEnabled: boolean;
  contactEmail: string | null;
  whatsappNumber: string | null;
  mapsUrl: string | null;
  notes: string | null;
  defaults: {
    outletName: string;
    outletCode: string;
    address: string | null;
    phone: string | null;
    status: string;
  };
};

type Envelope = {
  success?: boolean;
  message?: string;
  data?: OutletSettingsResponse;
};

export async function getOutletSettings(outletId: string) {
  const response = await api.get<Envelope>('/settings/outlet', {
    params: { outletId },
  });

  if (!response.data.data) {
    throw new Error('Pengaturan outlet tidak ditemukan');
  }

  return response.data.data;
}

export async function updateOutletSettings(
  outletId: string,
  payload: Omit<OutletSettingsResponse, 'defaults'>,
) {
  const response = await api.put<Envelope>('/settings/outlet', {
    outletId,
    ...payload,
  });

  if (!response.data.data) {
    throw new Error('Gagal menyimpan pengaturan outlet');
  }

  return response.data.data;
}

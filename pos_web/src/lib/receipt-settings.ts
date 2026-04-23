import { api } from '@/lib/api';

export type ReceiptSettingsResponse = {
  brandName: string | null;
  logoUrl: string | null;
  headerText: string | null;
  footerText: string | null;
  showBusinessName: boolean;
  showOutletName: boolean;
  showOutletAddress: boolean;
  showOutletPhone: boolean;
  defaults: {
    businessName: string;
    outletName: string;
    outletAddress: string | null;
    outletPhone: string | null;
  };
};

type ReceiptSettingsEnvelope = {
  success?: boolean;
  message?: string;
  data?: ReceiptSettingsResponse;
};

export async function getReceiptSettings(outletId: string) {
  const response = await api.get<ReceiptSettingsEnvelope>('/settings/receipt', {
    params: { outletId },
  });

  if (!response.data.data) {
    throw new Error('Pengaturan struk tidak ditemukan');
  }

  return response.data.data;
}

export async function updateReceiptSettings(
  outletId: string,
  payload: Omit<ReceiptSettingsResponse, 'defaults'>,
) {
  const response = await api.put<ReceiptSettingsEnvelope>('/settings/receipt', {
    outletId,
    ...payload,
  });

  if (!response.data.data) {
    throw new Error('Gagal menyimpan pengaturan struk');
  }

  return response.data.data;
}

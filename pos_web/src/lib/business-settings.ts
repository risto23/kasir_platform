import { api } from '@/lib/api';

export type BusinessSettingsResponse = {
  businessName: string;
  supportEmail: string | null;
  supportPhone: string | null;
  websiteUrl: string | null;
  address: string | null;
  tagline: string | null;
  defaults: {
    businessName: string;
    slug: string;
    businessType: string;
    status: string;
  };
};

type Envelope = {
  success?: boolean;
  message?: string;
  data?: BusinessSettingsResponse;
};

export async function getBusinessSettings() {
  const response = await api.get<Envelope>('/settings/business');

  if (!response.data.data) {
    throw new Error('Pengaturan business tidak ditemukan');
  }

  return response.data.data;
}

export async function updateBusinessSettings(
  payload: Omit<BusinessSettingsResponse, 'defaults'>,
) {
  const response = await api.put<Envelope>('/settings/business', payload);

  if (!response.data.data) {
    throw new Error('Gagal menyimpan pengaturan business');
  }

  return response.data.data;
}

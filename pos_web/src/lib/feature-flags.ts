import { api } from '@/lib/api';

export type FeatureFlagItem = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  enabled: boolean;
};

export type BusinessFeatureFlags = {
  business: {
    id: string;
    name: string;
    slug: string;
    businessType: 'RESTAURANT' | 'RETAIL';
    status: 'ACTIVE' | 'INACTIVE';
  };
  items: FeatureFlagItem[];
};

export async function getBusinessFeatureFlags(): Promise<string[]> {
  const response = await api.get<{ data: BusinessFeatureFlags }>('/business/feature-flags');
  const result = response.data?.data;

  if (!result || !Array.isArray(result.items)) {
    return [];
  }

  return result.items.filter((item) => item.enabled).map((item) => item.key);
}

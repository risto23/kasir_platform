export type BusinessType = 'RESTAURANT' | 'RETAIL';
export type BusinessStatus = 'ACTIVE' | 'INACTIVE';

export type Business = {
  id: string;
  name: string;
  slug: string;
  businessType: BusinessType;
  status: BusinessStatus;
  ownerUser?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  outlets?: Array<{
    id: string;
    name: string;
    code: string;
  }>;
};
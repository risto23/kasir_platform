export type OutletStatus = 'ACTIVE' | 'INACTIVE';

export type Outlet = {
  id: string;
  businessId: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  status: OutletStatus;
  business?: {
    id: string;
    name: string;
    businessType: 'RESTAURANT' | 'RETAIL';
  };
};
export type OutletStatus = 'ACTIVE' | 'INACTIVE';

export type Outlet = {
  id: string;
  businessId: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  status: OutletStatus;
  totalAssignedUsers?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type OutletListResponse = {
  items: Outlet[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
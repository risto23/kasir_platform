export type OutletTableStatus = 'ACTIVE' | 'INACTIVE';

export type OutletTable = {
  id: string;
  outletId: string;
  code: string;
  name: string;
  capacity: number | null;
  status: OutletTableStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type OutletTableListResponse = {
  items: OutletTable[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
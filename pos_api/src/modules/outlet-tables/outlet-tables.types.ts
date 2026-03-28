import type { OutletTableStatus } from '@prisma/client';

export type OutletTablesListQuery = {
  page: number;
  limit: number;
  search?: string;
  status?: OutletTableStatus;
};

export type OutletIdParams = {
  outletId: string;
};

export type OutletTableIdParams = {
  outletId: string;
  id: string;
};

export type CreateOutletTableInput = {
  code: string;
  name: string;
  capacity?: number | null;
  status?: OutletTableStatus;
};

export type UpdateOutletTableInput = {
  code?: string;
  name?: string;
  capacity?: number | null;
  status?: OutletTableStatus;
};

export type UpdateOutletTableStatusInput = {
  status: OutletTableStatus;
};

export type OutletTableListItem = {
  id: string;
  outletId: string;
  code: string;
  name: string;
  capacity: number | null;
  status: OutletTableStatus;
  createdAt: string;
  updatedAt: string;
};

export type OutletTablesListResponse = {
  items: OutletTableListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
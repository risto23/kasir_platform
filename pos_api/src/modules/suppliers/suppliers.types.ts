export type SupplierListQuery = {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  isPreferred?: boolean;
  page: number;
  perPage: number;
};

export type SupplierParams = {
  id: string;
};

export type CreateSupplierBody = {
  code?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermDays?: number | null;
  taxNumber?: string | null;
  notes?: string | null;
  leadTimeDays?: number | null;
  isPreferred?: boolean;
};

export type UpdateSupplierBody = {
  code?: string | null;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermDays?: number | null;
  taxNumber?: string | null;
  notes?: string | null;
  leadTimeDays?: number | null;
  isPreferred?: boolean;
};

export type UpdateSupplierStatusBody = {
  status: 'ACTIVE' | 'INACTIVE';
};

export type CategoryListQuery = {
  search?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  page: number;
  perPage: number;
};

export type CategoryParams = {
  id: string;
};

export type CreateCategoryBody = {
  name: string;
  code?: string | null;
  description?: string | null;
  sortOrder?: number;
};

export type UpdateCategoryBody = {
  name: string;
  code?: string | null;
  description?: string | null;
  sortOrder?: number;
};

export type UpdateCategoryStatusBody = {
  status: 'ACTIVE' | 'INACTIVE';
};
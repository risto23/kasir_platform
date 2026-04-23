// pos_web/src/types/category.ts
export type CategoryStatus = 'ACTIVE' | 'INACTIVE';

export type Category = {
  id: string;
  businessId: string;
  code: string | null;
  name: string;
  description: string | null;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
  childrenCount?: number;
  sortOrder?: number;
  status: CategoryStatus;
  createdAt?: string;
  updatedAt?: string;
};

export type CategoryListResponse = {
  items: Category[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
};

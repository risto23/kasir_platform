export type KitchenItemStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'DONE'
  | 'SERVED'
  | 'CANCELLED';

export type KitchenOrderStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'IN_PROGRESS'
  | 'READY'
  | 'COMPLETED'
  | 'CANCELLED';

export type KitchenQueueFilter = 'WAITING' | 'PROCESSING' | 'READY';

export type KitchenTableSummary = {
  id: string;
  code: string;
  name: string;
  capacity: number | null;
};

export type KitchenOrderItem = {
  id: string;
  productId: string;
  productName: string;
  productCode: string | null;
  productSku: string | null;
  productBarcode: string | null;
  quantity: string;
  note: string | null;
  status: KitchenItemStatus;
  createdAt: string;
  updatedAt: string;
};

export type KitchenOrder = {
  id: string;
  orderNumber: string;
  outletId: string;
  tableId: string | null;
  notes: string | null;
  status: KitchenOrderStatus;
  submittedAt: string | null;
  createdAt: string;
  updatedAt: string;
  table: KitchenTableSummary | null;
  items: KitchenOrderItem[];
};

export type KitchenOrderListMeta = {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type KitchenOrderListPayload = {
  items: KitchenOrder[];
  meta: KitchenOrderListMeta;
};

export type KitchenOrderListResponse = {
  success: boolean;
  message: string;
  data: KitchenOrderListPayload;
};

export type KitchenOrderItemUpdatePayload = {
  orderId: string;
  orderNumber: string;
  outletId: string;
  orderStatus: KitchenOrderStatus;
  table: {
    id: string;
    code: string;
    name: string;
  } | null;
  item: KitchenOrderItem;
};

export type KitchenOrderItemUpdateResponse = {
  success: boolean;
  message: string;
  data: KitchenOrderItemUpdatePayload;
};

export type OutletOption = {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
};

export type OutletListResponse = {
  success: boolean;
  message: string;
  data: {
    items: OutletOption[];
  };
};

export type CurrentUserPlatformRole = 'SUPER_ADMIN';

export type CurrentUserBusinessRole =
  | 'OWNER'
  | 'ADMIN'
  | 'CASHIER'
  | 'KITCHEN'
  | 'INVENTORY';

export type CurrentUserBusinessType = 'RESTAURANT' | 'RETAIL';

export type CurrentUserPermission = string;

export type CurrentUserBusinessMembership = {
  businessUserId: string;
  businessId: string;
  businessName: string;
  businessType: CurrentUserBusinessType;
  role: CurrentUserBusinessRole;
  status: 'ACTIVE' | 'INACTIVE';
  isPrimary: boolean;
  hasAllOutletAccess: boolean;
  allowedOutletIds: string[];
  permissions?: CurrentUserPermission[];
};

export type CurrentUser = {
  id: string;
  fullName: string;
  email: string;
  platformRoles?: CurrentUserPlatformRole[];
  businessMemberships?: CurrentUserBusinessMembership[];
};

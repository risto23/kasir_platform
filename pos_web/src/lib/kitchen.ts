import { api } from '@/lib/api';
import { getActiveBusinessId, getCachedCurrentUser } from '@/lib/auth';
import type {
  CurrentUser,
  CurrentUserBusinessMembership,
  KitchenItemStatus,
  KitchenOrderItemUpdateResponse,
  KitchenOrderListResponse,
  KitchenQueueFilter,
  OutletListResponse,
  OutletOption,
} from '@/types/kitchen';

function getCurrentUser(): CurrentUser | null {
  const currentUser = getCachedCurrentUser();

  if (!currentUser) {
    return null;
  }

  return currentUser as CurrentUser;
}

export function getActiveBusinessMembership():
  | CurrentUserBusinessMembership
  | null {
  const currentUser = getCurrentUser();
  const activeBusinessId = getActiveBusinessId();

  if (!currentUser || !activeBusinessId) {
    return null;
  }

  const membership = currentUser.businessMemberships?.find(
    (item) => item.businessId === activeBusinessId,
  );

  return membership ?? null;
}

export function isSuperAdminUser(): boolean {
  const currentUser = getCurrentUser();

  if (!currentUser?.platformRoles?.length) {
    return false;
  }

  return currentUser.platformRoles.includes('SUPER_ADMIN');
}

export function canAccessKitchenPage(): boolean {
  if (isSuperAdminUser()) {
    return true;
  }

  const membership = getActiveBusinessMembership();

  if (!membership) {
    return false;
  }

  if (membership.businessType !== 'RESTAURANT') {
    return false;
  }

  return membership.role === 'KITCHEN';
}

export async function fetchKitchenOutlets(): Promise<OutletOption[]> {
  const membership = getActiveBusinessMembership();
  const response = await api.get<OutletListResponse>('/business/outlets', {
    params: {
      status: 'ACTIVE',
      perPage: 100,
    },
  });

  const outlets = response.data.data?.items ?? [];

  if (isSuperAdminUser()) {
    return outlets;
  }

  if (!membership) {
    return [];
  }

  if (membership.hasAllOutletAccess) {
    return outlets;
  }

  const allowedOutletIds = new Set(membership.allowedOutletIds);

  return outlets.filter((item) => allowedOutletIds.has(item.id));
}

export async function fetchKitchenOrders(params: {
  outletId: string;
  page?: number;
  perPage?: number;
  queue?: KitchenQueueFilter;
}) {
  const response = await api.get<KitchenOrderListResponse>(
    `/outlets/${params.outletId}/kitchen/orders`,
    {
      params: {
        page: params.page ?? 1,
        perPage: params.perPage ?? 20,
        queue: params.queue,
      },
    },
  );

  return response.data.data;
}

export async function updateKitchenItemStatus(params: {
  orderId: string;
  itemId: string;
  status: Extract<KitchenItemStatus, 'PROCESSING' | 'DONE' | 'SERVED' | 'CANCELLED'>;
}) {
  const response = await api.patch<KitchenOrderItemUpdateResponse>(
    `/kitchen/orders/${params.orderId}/items/${params.itemId}/status`,
    {
      status: params.status,
    },
  );

  return response.data.data;
}
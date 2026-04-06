import { api } from '@/lib/api';
import { getActiveBusinessId } from '@/lib/auth';
import type {
  GetOutletTableMonitorApiResponse,
  GetTableQrApiResponse,
  OutletTableMonitorResponse,
  TableQrBulkItem,
  TableQrResponse,
} from '@/types/restaurant-operations';

function getRequiredBusinessId(): string {
  const businessId = getActiveBusinessId();

  if (!businessId || businessId.trim() === '') {
    throw new Error('Business context aktif tidak ditemukan.');
  }

  return businessId.trim();
}

export async function getTableQr(params: {
  outletId: string;
  tableId: string;
}): Promise<TableQrResponse> {
  const outletId = params.outletId.trim();
  const tableId = params.tableId.trim();
  const businessId = getRequiredBusinessId();

  if (!outletId) {
    throw new Error('outletId wajib diisi.');
  }

  if (!tableId) {
    throw new Error('tableId wajib diisi.');
  }

  const response = await api.get<GetTableQrApiResponse>(
    `/outlets/${encodeURIComponent(outletId)}/qr/tables/${encodeURIComponent(tableId)}`,
    {
      headers: {
        'x-business-id': businessId,
      },
    },
  );

  const result = response.data;

  if (!result?.success || !result.data) {
    throw new Error(result?.message ?? 'Gagal mengambil QR meja.');
  }

  return result.data;
}

export async function getOutletTableMonitor(params: {
  outletId: string;
}): Promise<OutletTableMonitorResponse> {
  const outletId = params.outletId.trim();
  const businessId = getRequiredBusinessId();

  if (!outletId) {
    throw new Error('outletId wajib diisi.');
  }

  const response = await api.get<GetOutletTableMonitorApiResponse>(
    `/outlets/${encodeURIComponent(outletId)}/tables/monitor`,
    {
      headers: {
        'x-business-id': businessId,
      },
    },
  );

  const result = response.data;

  if (!result?.success || !result.data) {
    throw new Error(result?.message ?? 'Gagal mengambil monitor meja.');
  }

  return result.data;
}

export async function getTableQrBulkByOutlet(params: {
  outletId: string;
}): Promise<TableQrBulkItem[]> {
  const outletId = params.outletId.trim();

  if (!outletId) {
    throw new Error('outletId wajib diisi.');
  }

  const monitor = await getOutletTableMonitor({ outletId });

  const activeTables = monitor.items.filter(
    (item) => item.tableStatus === 'ACTIVE',
  );

  const qrItems = await Promise.all(
    activeTables.map((table) =>
      getTableQr({
        outletId,
        tableId: table.id,
      }),
    ),
  );

  return qrItems.map((item) => ({
    outlet: item.outlet,
    table: item.table,
    token: item.token,
    guestMenuUrl: item.guestMenuUrl,
    qrValue: item.qrValue,
  }));
}

import { api } from '@/lib/api';
import type { AuditLogListResponse } from '@/types/audit-log';

type AuditLogEnvelope = {
  success: boolean;
  message: string;
  data: AuditLogListResponse;
};

export async function fetchAuditLogs(params: {
  outletId?: string;
  action?: string;
  entityType?: string;
  page?: number;
  limit?: number;
}) {
  const response = await api.get<AuditLogEnvelope>('/audit-logs', {
    params,
  });

  if (!response.data.data) {
    throw new Error('Audit log tidak tersedia');
  }

  return response.data.data;
}

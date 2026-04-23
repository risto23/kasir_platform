export type AuditLogActor = {
  id: string;
  fullName: string;
  email: string;
};

export type AuditLogOutlet = {
  id: string;
  name: string;
  code: string;
};

export type AuditLogItem = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  summary: string | null;
  changes: unknown;
  metadata: unknown;
  createdAt: string;
  actor: AuditLogActor | null;
  outlet: AuditLogOutlet | null;
};

export type AuditLogListResponse = {
  items: AuditLogItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

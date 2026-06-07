import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type AuditLogRecord = {
  action: string;
  actorId: string;
  createdAt: string;
  id: string;
};

export type AuditLogsQuery = {
  action?: string;
  actorId?: string;
  page?: number;
  pageSize?: number;
};

export function listAuditLogs(params?: AuditLogsQuery) {
  return unwrapData<AuditLogRecord[]>(apiClient.get("/audit-logs", { params }));
}

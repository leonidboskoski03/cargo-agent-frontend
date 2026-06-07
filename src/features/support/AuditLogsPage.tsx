import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listAuditLogs } from "@/shared/api/modules/auditLogs";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Table, Td, Th } from "@/shared/components/ui/DataTable";
import { useAuthStore } from "@/features/auth/authStore";
import { canViewAuditLogs } from "./supportPermissions";
import { auditFilterSchema } from "./supportSchemas";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function AuditLogsPage() {
  const user = useAuthStore((state) => state.user);
  const canView = canViewAuditLogs(user?.role);
  const [actorId, setActorId] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const filters = useMemo(() => auditFilterSchema.parse({ action, actorId, page, pageSize }), [action, actorId, page, pageSize]);
  const auditQuery = useQuery({ enabled: canView, queryFn: () => listAuditLogs(filters), queryKey: ["audit-logs", filters] });
  const logs = auditQuery.data ?? [];

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Admin" subtitle="Audit logs are restricted to company admins." title="Audit logs" />
        <ErrorState description="Your current role can access operational pages but not audit history." title="Admin access required" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" subtitle="Traceable platform activity for company operations." title="Audit logs" />
      <Surface>
        <div className="mb-4 grid gap-3 md:grid-cols-[1fr_1fr_120px_140px_auto] md:items-end">
          <Field label="Actor ID"><Input onChange={(event) => setActorId(event.target.value)} value={actorId} /></Field>
          <Field label="Action"><Input onChange={(event) => setAction(event.target.value)} value={action} /></Field>
          <Field label="Page"><Input min={1} onChange={(event) => setPage(Number(event.target.value))} type="number" value={page} /></Field>
          <Field label="Page size"><Input max={100} min={1} onChange={(event) => setPageSize(Number(event.target.value))} type="number" value={pageSize} /></Field>
          <Button onClick={() => auditQuery.refetch()} type="button"><Search className="size-4" /> Apply</Button>
        </div>
        {auditQuery.isLoading ? (
          <LoadingState title="Loading audit logs" />
        ) : auditQuery.isError ? (
          <ErrorState error={auditQuery.error} title="Audit logs unavailable" />
        ) : logs.length === 0 ? (
          <EmptyState description="No audit entries matched the current filters." title="No audit logs" />
        ) : (
          <Table>
            <thead><tr><Th>Action</Th><Th>Actor</Th><Th>Created</Th><Th>ID</Th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <Td className="font-semibold">{log.action}</Td>
                  <Td>{log.actorId}</Td>
                  <Td>{formatDate(log.createdAt)}</Td>
                  <Td className="text-muted">{log.id.slice(0, 12)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Surface>
    </div>
  );
}

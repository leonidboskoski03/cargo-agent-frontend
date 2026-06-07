import { FileText, RotateCcw, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { listUsers } from "@/shared/api/modules/users";
import { createDocument, deleteDocument, listDocuments, restoreDocument, type DocumentKind, type DocumentRecord } from "@/shared/api/modules/documents";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageDocuments } from "./supportPermissions";
import { documentCreateSchema, documentFilterSchema } from "./supportSchemas";

const documentKinds: DocumentKind[] = ["COMPANY_LICENSE", "VEHICLE_REGISTRATION", "INSURANCE", "CONTRACT_ATTACHMENT", "OTHER"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageDocuments(user?.role);
  const [kind, setKind] = useState<DocumentKind | "">("");
  const [recentlyDeleted, setRecentlyDeleted] = useState<DocumentRecord | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    kind: "OTHER",
    metadataJson: "",
    mimeType: "application/pdf",
    name: "",
    ownerCompanyId: user?.companyId ?? "",
    ownerUserId: "",
    url: "",
  });
  const filters = useMemo(() => documentFilterSchema.parse({ kind: kind || undefined, page: 1, pageSize: 50 }), [kind]);
  const documentsQuery = useQuery({ queryFn: () => listDocuments(filters), queryKey: ["documents", filters] });
  const usersQuery = useQuery({ enabled: canManage, queryFn: () => listUsers(), queryKey: ["users"] });
  const documents = documentsQuery.data ?? [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["documents"] });
  const createMutation = useAppMutation({ mutationFn: createDocument, messages: { success: "Document metadata created." }, onSuccess: () => {
    setForm((current) => ({ ...current, metadataJson: "", name: "", ownerUserId: "", url: "" }));
    refresh();
  } });
  const deleteMutation = useAppMutation({ mutationFn: deleteDocument, messages: { success: "Document deleted." }, onSuccess: (document) => {
    setRecentlyDeleted(document);
    refresh();
  } });
  const restoreMutation = useAppMutation({ mutationFn: restoreDocument, messages: { success: "Document restored." }, onSuccess: () => {
    setRecentlyDeleted(null);
    refresh();
  } });

  const updateForm = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const submitDocument = () => {
    const parsed = documentCreateSchema.safeParse(form);
    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "Check the document fields.");
      return;
    }
    setValidationMessage(null);
    createMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        subtitle="URL-based document metadata for company, vehicle, insurance, and contract records."
        title="Documents"
      />
      {validationMessage ? <Surface className="border-amber-200 bg-amber-50"><p className="text-sm font-semibold text-amber-800">{validationMessage}</p></Surface> : null}
      <section className="grid gap-5 xl:grid-cols-[0.36fr_0.64fr]">
        <Surface>
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold tracking-normal">{canManage ? "Create document metadata" : "Read-only document view"}</h2>
              <p className="mt-1 text-sm text-muted">File uploads are not part of this sprint; records point to URLs.</p>
            </div>
          </div>
          {canManage ? (
            <div className="mt-5 space-y-3">
              <Field label="Kind" required>
                <Select onChange={(event) => updateForm("kind", event.target.value)} value={form.kind}>
                  {documentKinds.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
              </Field>
              <Field label="Name" required><Input onChange={(event) => updateForm("name", event.target.value)} value={form.name} /></Field>
              <Field label="MIME type" required><Input onChange={(event) => updateForm("mimeType", event.target.value)} value={form.mimeType} /></Field>
              <Field label="URL" required><Input onChange={(event) => updateForm("url", event.target.value)} placeholder="https://example.com/document.pdf" value={form.url} /></Field>
              <Field label="Owner user">
                <Select onChange={(event) => updateForm("ownerUserId", event.target.value)} value={form.ownerUserId}>
                  <option value="">Company scoped</option>
                  {(usersQuery.data ?? []).map((profile) => (
                    <option key={profile.id} value={profile.id}>{profile.firstName} {profile.lastName}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Owner company ID"><Input onChange={(event) => updateForm("ownerCompanyId", event.target.value)} value={form.ownerCompanyId} /></Field>
              <Field label="Metadata JSON"><Textarea onChange={(event) => updateForm("metadataJson", event.target.value)} value={form.metadataJson} /></Field>
              <Button disabled={createMutation.isPending} onClick={submitDocument} type="button">Create document</Button>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-border bg-surface-pearl px-4 py-3 text-sm text-muted">
              Drivers can view document records allowed by the backend but cannot mutate them here.
            </p>
          )}
        </Surface>
        <Surface>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Document records</h2>
              <p className="mt-1 text-sm text-muted">{documents.length} records on this view.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Kind filter">
                <Select onChange={(event) => setKind(event.target.value as DocumentKind | "")} value={kind}>
                  <option value="">All kinds</option>
                  {documentKinds.map((item) => <option key={item} value={item}>{item}</option>)}
                </Select>
              </Field>
              {recentlyDeleted ? (
                <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(recentlyDeleted.id)} type="button" variant="secondary">
                  <RotateCcw className="size-4" /> Restore last
                </Button>
              ) : null}
            </div>
          </div>
          {documentsQuery.isLoading ? (
            <LoadingState title="Loading documents" />
          ) : documentsQuery.isError ? (
            <ErrorState error={documentsQuery.error} title="Documents unavailable" />
          ) : documents.length === 0 ? (
            <EmptyState description="Document metadata matching this filter will appear here." title="No documents" />
          ) : (
            <Table>
              <thead><tr><Th>Name</Th><Th>Kind</Th><Th>Created</Th>{canManage ? <Th>Action</Th> : null}</tr></thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <Td className="font-semibold">{document.name}</Td>
                    <Td><StatusBadge>{document.type}</StatusBadge></Td>
                    <Td>{formatDate(document.createdAt)}</Td>
                    {canManage ? (
                      <Td>
                        <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(document.id)} type="button" variant="danger">
                          <Trash2 className="size-4" /> Delete
                        </Button>
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Surface>
      </section>
    </div>
  );
}

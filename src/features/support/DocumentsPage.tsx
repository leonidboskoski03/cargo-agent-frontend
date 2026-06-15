import { FileText, RotateCcw, Save, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { deleteDocument, listDocuments, restoreDocument, uploadDocument, type DocumentKind, type DocumentRecord } from "@/shared/api/modules/documents";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { fileToBase64 } from "@/shared/lib/files";
import { humanizeEnum } from "@/shared/lib/formatters";
import { canManageDocuments } from "./supportPermissions";
import { documentFilterSchema, documentUploadFormSchema } from "./supportSchemas";

const documentKinds: DocumentKind[] = ["COMPANY_LICENSE", "VEHICLE_REGISTRATION", "INSURANCE", "CONTRACT_ATTACHMENT", "OTHER"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function documentKindLabel(value?: DocumentKind | string | null) {
  return humanizeEnum(value);
}

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageDocuments(user?.role);
  const [kind, setKind] = useState<DocumentKind | "">("");
  const [recentlyDeleted, setRecentlyDeleted] = useState<DocumentRecord | null>(null);
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadControlKey, setUploadControlKey] = useState(0);
  const [form, setForm] = useState({
    kind: "OTHER",
    name: "",
  });
  const isDeletedView = registryView === "deleted";
  const filters = useMemo(() => documentFilterSchema.parse({ deleted: isDeletedView ? "only" : "active", kind: kind || undefined, page: 1, pageSize: 50 }), [isDeletedView, kind]);
  const documentsQuery = useQuery({ queryFn: () => listDocuments(filters), queryKey: ["documents", filters] });
  const documents = documentsQuery.data ?? [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["documents"] });
  const uploadMutation = useAppMutation({ mutationFn: async () => {
    if (!selectedFile) throw new Error("Choose a file before uploading.");
    const parsed = documentUploadFormSchema.parse(form);
    return uploadDocument({
      contentBase64: await fileToBase64(selectedFile),
      fileName: selectedFile.name,
      kind: parsed.kind,
      metadataJson: { source: "DOCUMENTS_REGISTRY_UPLOAD" },
      mimeType: selectedFile.type || "application/octet-stream",
      name: parsed.name,
    });
  }, messages: { success: "Document uploaded." }, onSuccess: () => {
    setForm({ kind: "OTHER", name: "" });
    setSelectedFile(null);
    setUploadControlKey((current) => current + 1);
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
    const parsed = documentUploadFormSchema.safeParse(form);
    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "Check the document fields.");
      return;
    }
    if (!selectedFile) {
      setValidationMessage("Choose a file before uploading.");
      return;
    }
    setValidationMessage(null);
    uploadMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        subtitle="Upload and organize company, vehicle, insurance, and contract documents."
        title="Documents"
      />
      {validationMessage ? <Surface className="border-amber-200 bg-amber-50"><p className="text-sm font-semibold text-amber-800">{validationMessage}</p></Surface> : null}
      <section className="grid gap-5 xl:grid-cols-[0.36fr_0.64fr]">
        <Surface>
          <div className="flex items-center gap-3">
            <FileText className="size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold tracking-normal">{canManage ? "Upload document" : "Read-only document view"}</h2>
              <p className="mt-1 text-sm text-muted">Save operational documents to the company registry.</p>
            </div>
          </div>
          {canManage ? (
            <div className="mt-5 space-y-3">
              <Field label="Kind" required>
                <Select onChange={(event) => updateForm("kind", event.target.value)} value={form.kind}>
                  {documentKinds.map((item) => <option key={item} value={item}>{documentKindLabel(item)}</option>)}
                </Select>
              </Field>
              <Field label="Name" required><Input onChange={(event) => updateForm("name", event.target.value)} value={form.name} /></Field>
              <Field label="File" required>
                <FileUploadControl
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={uploadMutation.isPending}
                  error={uploadMutation.error}
                  isUploading={uploadMutation.isPending}
                  key={uploadControlKey}
                  onFileSelect={setSelectedFile}
                  value={selectedFile?.name}
                />
              </Field>
              <Button disabled={uploadMutation.isPending} onClick={submitDocument} type="button">
                <Save className="size-4" /> Upload document
              </Button>
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
              {canManage ? (
                <div className="inline-flex rounded-lg border border-border bg-surface-pearl p-1" aria-label="Document registry view">
                  <Button
                    aria-pressed={!isDeletedView}
                    className="min-h-8 px-3 py-1 text-sm"
                    onClick={() => setRegistryView("active")}
                    type="button"
                    variant={!isDeletedView ? "secondary" : "ghost"}
                  >
                    Active
                  </Button>
                  <Button
                    aria-pressed={isDeletedView}
                    className="min-h-8 px-3 py-1 text-sm"
                    onClick={() => setRegistryView("deleted")}
                    type="button"
                    variant={isDeletedView ? "secondary" : "ghost"}
                  >
                    Deleted
                  </Button>
                </div>
              ) : null}
              <Field label="Kind filter">
                <Select onChange={(event) => setKind(event.target.value as DocumentKind | "")} value={kind}>
                  <option value="">All kinds</option>
                  {documentKinds.map((item) => <option key={item} value={item}>{documentKindLabel(item)}</option>)}
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
            <EmptyState
              description={isDeletedView ? "Deleted document metadata matching this filter will appear here." : "Document metadata matching this filter will appear here."}
              title={isDeletedView ? "No deleted documents" : "No documents"}
            />
          ) : (
            <Table>
              <thead><tr><Th>Name</Th><Th>Kind</Th><Th>Status</Th><Th>Created</Th>{canManage ? <Th>Action</Th> : null}</tr></thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id}>
                    <Td className="font-semibold">{document.name}</Td>
                    <Td><StatusBadge>{documentKindLabel(document.kind ?? document.type)}</StatusBadge></Td>
                    <Td><StatusBadge tone={isDeletedView ? "danger" : "success"}>{isDeletedView ? "Deleted" : "Active"}</StatusBadge></Td>
                    <Td>{formatDate(document.createdAt)}</Td>
                    {canManage ? (
                      <Td>
                        {isDeletedView ? (
                          <Tooltip label="Restore document">
                            <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(document.id)} type="button" variant="secondary">
                              <RotateCcw className="size-4" /> Restore
                            </Button>
                          </Tooltip>
                        ) : (
                          <Tooltip label="Delete document">
                            <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(document.id)} type="button" variant="danger">
                              <Trash2 className="size-4" /> Delete
                            </Button>
                          </Tooltip>
                        )}
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

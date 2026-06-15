import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { IdCard, Pencil, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { uploadDocument } from "@/shared/api/modules/documents";
import { createLicense, deleteLicense, listLicenses, listLicenseTypes, restoreLicense, updateLicense, type LicenseRecord } from "@/shared/api/modules/licenses";
import { listUsers } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Checkbox, Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { fileToBase64 } from "@/shared/lib/files";
import { useAuthStore } from "@/features/auth/authStore";
import { formatDate, formatUser } from "./fleetFormatters";
import { canManageFleet } from "./fleetPermissions";
import { licenseSchema, type LicenseFormInput, type LicenseFormValues } from "./fleetSchemas";

const licenseDefaults: LicenseFormInput = {
  documentUrl: "",
  expiresAt: "",
  imageUrl: "",
  isValid: true,
  issuedAt: "",
  licenseType: "",
  userId: "",
};

function toLicenseForm(license: LicenseRecord): LicenseFormInput {
  return {
    documentUrl: license.documentUrl ?? "",
    expiresAt: license.expiresAt?.slice(0, 10) ?? "",
    imageUrl: license.imageUrl ?? "",
    isValid: license.isValid,
    issuedAt: license.issuedAt?.slice(0, 10) ?? "",
    licenseType: license.licenseType,
    userId: license.userId,
  };
}

export function FleetLicensesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageFleet(user?.role);
  const canAttachOwnLicense = user?.role === "COMPANY_DRIVER";
  const [filterUserId, setFilterUserId] = useState("");
  const [editing, setEditing] = useState<LicenseRecord | null>(null);
  const [deleted, setDeleted] = useState<LicenseRecord | null>(null);
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");
  const usersQuery = useQuery({ enabled: canManage, queryFn: () => listUsers({ includeInactive: false }), queryKey: ["users", "active"] });
  const licenseTypesQuery = useQuery({ queryFn: listLicenseTypes, queryKey: ["licenses", "types"], staleTime: 1000 * 60 * 30 });
  const licensesQuery = useQuery({
    queryFn: () => listLicenses({
      deleted: registryView === "deleted" ? "only" : "active",
      ...(filterUserId ? { userId: filterUserId } : {}),
    }),
    queryKey: ["licenses", filterUserId || "ALL", registryView],
  });
  const companyUsers = useMemo(
    () => canManage
      ? (usersQuery.data ?? []).filter((item) => item.role === "COMPANY_ADMIN" || item.role === "COMPANY_DRIVER")
      : user ? [user] : [],
    [canManage, user, usersQuery.data],
  );
  const form = useForm<LicenseFormInput, unknown, LicenseFormValues>({
    resolver: zodResolver(licenseSchema),
    defaultValues: licenseDefaults,
  });
  const documentUrl = String(useWatch({ control: form.control, name: "documentUrl" }) ?? "");
  const imageUrl = String(useWatch({ control: form.control, name: "imageUrl" }) ?? "");

  useEffect(() => {
    form.reset(editing ? toLicenseForm(editing) : { ...licenseDefaults, userId: canManage ? companyUsers[0]?.id ?? "" : user?.id ?? "" });
  }, [canManage, companyUsers, editing, form, user?.id]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["licenses"] });
  const createMutation = useAppMutation({ messages: { success: "License created" }, mutationFn: createLicense, onSuccess: () => { form.reset({ ...licenseDefaults, userId: canManage ? companyUsers[0]?.id ?? "" : user?.id ?? "" }); void refresh(); } });
  const updateMutation = useAppMutation({ messages: { success: "License updated" }, mutationFn: (values: LicenseFormValues) => updateLicense(editing?.id ?? "", values), onSuccess: () => { setEditing(null); void refresh(); } });
  const deleteMutation = useAppMutation({ messages: { success: "License deleted" }, mutationFn: deleteLicense, onSuccess: (record) => { setDeleted(record); void refresh(); } });
  const restoreMutation = useAppMutation({ messages: { success: "License restored" }, mutationFn: restoreLicense, onSuccess: () => { setDeleted(null); void refresh(); } });
  const licensePhotoUpload = useAppMutation({
    messages: { success: "License photo uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "OTHER",
      metadataJson: { purpose: "LICENSE_PHOTO", userId: form.getValues("userId") },
      mimeType: file.type || "image/png",
      name: `License photo ${form.getValues("licenseType") || ""}`.trim(),
    }),
    onSuccess: (document) => {
      if (document.url) form.setValue("imageUrl", document.url, { shouldDirty: true, shouldValidate: true });
    },
  });
  const licenseDocumentUpload = useAppMutation({
    messages: { success: "License document uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "OTHER",
      metadataJson: { purpose: "LICENSE_DOCUMENT", userId: form.getValues("userId") },
      mimeType: file.type || "application/pdf",
      name: `License document ${form.getValues("licenseType") || ""}`.trim(),
    }),
    onSuccess: (document) => {
      if (document.url) form.setValue("documentUrl", document.url, { shouldDirty: true, shouldValidate: true });
    },
  });

  if (licensesQuery.isLoading || (canManage && usersQuery.isLoading) || licenseTypesQuery.isLoading) return <LoadingState description="Loading licenses and user filters." title="Loading licenses" />;
  if (licensesQuery.error || usersQuery.error || licenseTypesQuery.error) return <ErrorState description="License data could not be loaded." error={licensesQuery.error ?? usersQuery.error ?? licenseTypesQuery.error} title="Unable to load licenses" />;

  const licenses = licensesQuery.data ?? [];
  const isDeletedView = registryView === "deleted";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fleet operations" subtitle="Track driver credentials and validity windows." title="Licenses" />

      {deleted && canManage ? (
        <Surface className="flex flex-col gap-3 border-amber-200 bg-amber-50 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-amber-800">Deleted {deleted.licenseType}. Restore is available while this record is cached.</p>
          <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(deleted.id)} type="button" variant="secondary">
            <RotateCcw aria-hidden="true" className="size-4" />
            Restore
          </Button>
        </Surface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.36fr_0.64fr]">
        {canManage || canAttachOwnLicense ? (
          <Surface>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => editing ? updateMutation.mutate(values) : createMutation.mutate(values))}>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">{editing ? "Edit license" : canManage ? "Add license" : "Attach my license"}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {canManage ? "Attach credentials to company users and validate the date window." : "Upload your driver license so company admins can review it."}
                </p>
              </div>
              {canManage ? (
                <Field error={form.formState.errors.userId?.message} label="User" required>
                  <Select {...form.register("userId")} disabled={Boolean(editing)}>
                    <option value="">Select user</option>
                    {companyUsers.map((item) => <option key={item.id} value={item.id}>{formatUser(item)}</option>)}
                  </Select>
                </Field>
              ) : <input type="hidden" {...form.register("userId")} />}
              <Field error={form.formState.errors.licenseType?.message} label="License type" required>
                <Select {...form.register("licenseType")}>
                  <option value="">Select license type</option>
                  {(licenseTypesQuery.data ?? []).map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}
                </Select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field error={form.formState.errors.issuedAt?.message} label="Issued date">
                  <Input {...form.register("issuedAt")} type="date" />
                </Field>
                <Field error={form.formState.errors.expiresAt?.message} label="Expiry date">
                  <Input {...form.register("expiresAt")} type="date" />
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field error={form.formState.errors.imageUrl?.message} label="License photo URL">
                  <div className="space-y-2">
                    <Input {...form.register("imageUrl")} placeholder="https://.../license.jpg" type="url" />
                    <FileUploadControl
                      accept="image/jpeg,image/png,image/webp"
                      disabled={licensePhotoUpload.isPending}
                      error={licensePhotoUpload.error}
                      isUploading={licensePhotoUpload.isPending}
                      onFileSelect={(file) => licensePhotoUpload.mutate(file)}
                      previewAlt="License photo preview"
                      previewUrl={imageUrl}
                      value={imageUrl}
                    />
                  </div>
                </Field>
                <Field error={form.formState.errors.documentUrl?.message} label="License document URL">
                  <div className="space-y-2">
                    <Input {...form.register("documentUrl")} placeholder="https://.../credential.pdf" type="url" />
                    <FileUploadControl
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      disabled={licenseDocumentUpload.isPending}
                      error={licenseDocumentUpload.error}
                      isUploading={licenseDocumentUpload.isPending}
                      onFileSelect={(file) => licenseDocumentUpload.mutate(file)}
                      value={documentUrl}
                    />
                  </div>
                </Field>
              </div>
              <div className="rounded-xl bg-surface-pearl p-4">
                <Checkbox {...form.register("isValid")}>Mark license valid</Checkbox>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button disabled={createMutation.isPending || updateMutation.isPending} type="submit">
                  <Save aria-hidden="true" className="size-4" />
                  {editing ? "Save license" : canManage ? "Add license" : "Attach license"}
                </Button>
                {editing ? <Button onClick={() => setEditing(null)} type="button" variant="secondary">Cancel</Button> : null}
              </div>
            </form>
          </Surface>
        ) : (
          <Surface>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl"><IdCard aria-hidden="true" className="size-5 text-primary" /></div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.28px]">Read-only license view</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Drivers can inspect license context returned for their account.</p>
          </Surface>
        )}

        <Surface>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">License registry</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {isDeletedView ? "Restore deleted license records without mixing them into active compliance work." : "Filter by company user when reviewing a specific driver."}
              </p>
            </div>
            {canManage ? (
              <div className="flex w-full flex-col gap-3 md:w-auto md:min-w-72 md:items-end">
                <div className="inline-flex w-fit rounded-lg border border-border bg-surface-pearl p-1" aria-label="Fleet license registry view">
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
                <div className="w-full md:w-72">
                  <Field label="User filter">
                    <Select onChange={(event) => setFilterUserId(event.target.value)} value={filterUserId}>
                      <option value="">All users</option>
                      {companyUsers.map((item) => <option key={item.id} value={item.id}>{formatUser(item)}</option>)}
                    </Select>
                  </Field>
                </div>
              </div>
            ) : null}
          </div>
          <div className="mt-5">
            {licenses.length === 0 ? (
              <EmptyState
                description={isDeletedView ? "Deleted licenses will appear here after admins remove them from the active registry." : "Licenses will appear after credentials are added."}
                title={isDeletedView ? "No deleted licenses" : "No licenses found"}
              />
            ) : (
              <Table>
                <thead><tr><Th>User</Th><Th>License</Th><Th>Dates</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
                <tbody>
                  {licenses.map((license) => {
                    const owner = companyUsers.find((item) => item.id === license.userId);
                    return (
                      <tr key={license.id}>
                        <Td>{owner ? formatUser(owner) : license.userId}</Td>
                        <Td>
                          <p className="font-semibold">{license.licenseType}</p>
                          <p className="mt-1 text-xs text-muted">{[license.imageUrl ? "Photo added" : null, license.documentUrl ? "Document added" : null].filter(Boolean).join(" - ") || "No media"}</p>
                        </Td>
                        <Td>{formatDate(license.issuedAt)} to {formatDate(license.expiresAt)}</Td>
                        <Td><StatusBadge tone={isDeletedView ? "danger" : license.isValid ? "success" : "warning"}>{isDeletedView ? "DELETED" : license.isValid ? "VALID" : "INVALID"}</StatusBadge></Td>
                        <Td>
                          {canManage ? (
                            <div className="flex flex-wrap gap-2">
                              {isDeletedView ? (
                                <Tooltip label="Restore license">
                                  <Button
                                    aria-label={`Restore ${license.licenseType}`}
                                    className="h-9 min-h-9 px-3"
                                    disabled={restoreMutation.isPending}
                                    onClick={() => restoreMutation.mutate(license.id)}
                                    type="button"
                                    variant="secondary"
                                  >
                                    <RotateCcw aria-hidden="true" className="size-4" />
                                    Restore
                                  </Button>
                                </Tooltip>
                              ) : (
                                <>
                                  <Tooltip label="Edit license">
                                    <Button aria-label={`Edit ${license.licenseType}`} className="h-9 min-h-9 px-3" onClick={() => setEditing(license)} type="button" variant="secondary">
                                      <Pencil aria-hidden="true" className="size-4" />
                                      Edit
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Delete license">
                                    <Button aria-label={`Delete ${license.licenseType}`} className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(license.id)} type="button" variant="danger">
                                      <Trash2 aria-hidden="true" className="size-4" />
                                      Delete
                                    </Button>
                                  </Tooltip>
                                </>
                              )}
                            </div>
                          ) : <span className="text-sm text-muted">Read only</span>}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

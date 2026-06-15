import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, RotateCcw, Save, Trash2, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { uploadDocument } from "@/shared/api/modules/documents";
import { listSupportedCountries } from "@/shared/api/modules/geo";
import { createVehicle, deleteVehicle, listVehicles, restoreVehicle, updateVehicle, type VehicleRecord } from "@/shared/api/modules/vehicles";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Checkbox, Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { fileToBase64 } from "@/shared/lib/files";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageFleet } from "./fleetPermissions";
import { vehicleSchema, type VehicleFormInput, type VehicleFormValues } from "./fleetSchemas";

const vehicleDefaults: VehicleFormInput = {
  bodyType: "",
  brand: "",
  capacityKg: "",
  countryOfRegistration: "",
  documentsJson: "",
  hazmatCertified: false,
  imageUrl: "",
  isActive: true,
  model: "",
  plateNumber: "",
  refrigerated: false,
  vehicleType: "TRUCK",
  volumeM3: "",
  year: "",
};

function toVehicleForm(vehicle: VehicleRecord): VehicleFormInput {
  return {
    bodyType: vehicle.bodyType ?? "",
    brand: vehicle.brand ?? "",
    capacityKg: vehicle.capacityKg ?? "",
    countryOfRegistration: vehicle.countryOfRegistration,
    documentsJson: typeof vehicle.documentsJson === "string" ? vehicle.documentsJson : "",
    hazmatCertified: Boolean(vehicle.hazmatCertified),
    imageUrl: vehicle.imageUrl ?? "",
    isActive: vehicle.isActive,
    model: vehicle.model ?? "",
    plateNumber: vehicle.plateNumber,
    refrigerated: Boolean(vehicle.refrigerated),
    vehicleType: vehicle.vehicleType,
    volumeM3: vehicle.volumeM3 ?? "",
    year: vehicle.year ?? "",
  };
}

export function FleetVehiclesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageFleet(user?.role);
  const [editing, setEditing] = useState<VehicleRecord | null>(null);
  const [deleted, setDeleted] = useState<VehicleRecord | null>(null);
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");
  const vehiclesQuery = useQuery({
    queryFn: () => listVehicles({ deleted: registryView === "deleted" ? "only" : "active" }),
    queryKey: ["vehicles", registryView],
  });
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"], staleTime: 1000 * 60 * 30 });
  const vehicles = vehiclesQuery.data ?? [];
  const form = useForm<VehicleFormInput, unknown, VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicleDefaults,
  });
  const imageUrl = String(useWatch({ control: form.control, name: "imageUrl" }) ?? "");
  const documentsJson = String(useWatch({ control: form.control, name: "documentsJson" }) ?? "");

  useEffect(() => {
    form.reset(editing ? toVehicleForm(editing) : vehicleDefaults);
  }, [editing, form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  const createMutation = useAppMutation({ messages: { success: "Vehicle created" }, mutationFn: createVehicle, onSuccess: () => { form.reset(vehicleDefaults); void refresh(); } });
  const updateMutation = useAppMutation({ messages: { success: "Vehicle updated" }, mutationFn: (values: VehicleFormValues) => updateVehicle(editing?.id ?? "", values), onSuccess: () => { setEditing(null); void refresh(); } });
  const deleteMutation = useAppMutation({ messages: { success: "Vehicle deleted" }, mutationFn: deleteVehicle, onSuccess: (record) => { setDeleted(record); void refresh(); } });
  const restoreMutation = useAppMutation({ messages: { success: "Vehicle restored" }, mutationFn: restoreVehicle, onSuccess: () => { setDeleted(null); void refresh(); } });
  const vehicleImageUpload = useAppMutation({
    messages: { success: "Vehicle image uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "VEHICLE_REGISTRATION",
      metadataJson: { purpose: "VEHICLE_IMAGE" },
      mimeType: file.type || "image/png",
      name: `Vehicle image ${form.getValues("plateNumber") || ""}`.trim(),
    }),
    onSuccess: (document) => {
      if (document.url) form.setValue("imageUrl", document.url, { shouldDirty: true, shouldValidate: true });
    },
  });
  const vehicleDocumentUpload = useAppMutation({
    messages: { success: "Vehicle document uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: file.type === "application/pdf" ? "VEHICLE_REGISTRATION" : "OTHER",
      metadataJson: { purpose: "VEHICLE_COMPLIANCE" },
      mimeType: file.type || "application/pdf",
      name: `Vehicle document ${form.getValues("plateNumber") || ""}`.trim(),
    }),
    onSuccess: (document) => {
      if (!document.url) return;
      const current = form.getValues("documentsJson");
      form.setValue("documentsJson", [current, document.url].filter(Boolean).join("\n"), { shouldDirty: true, shouldValidate: true });
    },
  });

  if (vehiclesQuery.isLoading) return <LoadingState description="Loading company vehicles." title="Loading vehicles" />;
  if (vehiclesQuery.error) return <ErrorState description="Vehicle data could not be loaded." error={vehiclesQuery.error} title="Unable to load vehicles" />;
  const isDeletedView = registryView === "deleted";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Fleet operations" subtitle="Track company equipment, capabilities, and active status." title="Vehicles" />

      {deleted && canManage ? (
        <Surface className="flex flex-col gap-3 border-amber-200 bg-amber-50 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-amber-800">Deleted {deleted.plateNumber}. Restore is available until you leave this context.</p>
          <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(deleted.id)} type="button" variant="secondary">
            <RotateCcw aria-hidden="true" className="size-4" />
            Restore
          </Button>
        </Surface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.42fr_0.58fr]">
        {canManage ? (
          <Surface>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => editing ? updateMutation.mutate(values) : createMutation.mutate(values))}>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">{editing ? "Edit vehicle" : "Add vehicle"}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Register the asset, then attach media with uploads instead of raw links.</p>
              </div>
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase text-muted">Identity</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={form.formState.errors.vehicleType?.message} label="Type" required>
                    <Select {...form.register("vehicleType")}>
                      <option value="TRUCK">Truck</option>
                      <option value="TRAILER">Trailer</option>
                      <option value="VAN">Van</option>
                    </Select>
                  </Field>
                  <Field error={form.formState.errors.bodyType?.message} label="Body type">
                    <Select {...form.register("bodyType")}>
                      <option value="">Not set</option>
                      <option value="TILT">Tilt</option>
                      <option value="BOX">Box</option>
                      <option value="FLATBED">Flatbed</option>
                      <option value="REEFER">Reefer</option>
                      <option value="TANKER">Tanker</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-[0.65fr_0.35fr]">
                  <Field error={form.formState.errors.plateNumber?.message} label="Plate number" required>
                    <Input {...form.register("plateNumber")} />
                  </Field>
                  <Field error={form.formState.errors.countryOfRegistration?.message} label="Country" required>
                    <Select {...form.register("countryOfRegistration")}>
                      <option value="">Select</option>
                      {(countriesQuery.data ?? []).map((country) => <option key={country.code} value={country.code}>{country.code}</option>)}
                    </Select>
                  </Field>
                </div>
              </section>
              <section className="space-y-3 border-t border-border pt-4">
                <h3 className="text-sm font-semibold uppercase text-muted">Specs</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={form.formState.errors.brand?.message} label="Brand">
                    <Input {...form.register("brand")} />
                  </Field>
                  <Field error={form.formState.errors.model?.message} label="Model">
                    <Input {...form.register("model")} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <Field error={form.formState.errors.year?.message} label="Year">
                    <Input {...form.register("year")} inputMode="numeric" type="number" />
                  </Field>
                  <Field error={form.formState.errors.capacityKg?.message} label="Capacity kg">
                    <Input {...form.register("capacityKg")} inputMode="numeric" type="number" />
                  </Field>
                  <Field error={form.formState.errors.volumeM3?.message} label="Volume m3">
                    <Input {...form.register("volumeM3")} inputMode="decimal" type="number" />
                  </Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Checkbox {...form.register("refrigerated")}>Refrigerated</Checkbox>
                  <Checkbox {...form.register("hazmatCertified")}>Hazmat</Checkbox>
                  <Checkbox {...form.register("isActive")}>Active</Checkbox>
                </div>
              </section>
              <section className="space-y-3 border-t border-border pt-4">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-muted">Media and documents</h3>
                  <p className="mt-1 text-sm text-muted">Upload a vehicle photo or operating document; the saved file link is kept behind the form.</p>
                </div>
                <input type="hidden" {...form.register("imageUrl")} />
                <input type="hidden" {...form.register("documentsJson")} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={form.formState.errors.imageUrl?.message} label="Vehicle photo">
                    <FileUploadControl
                      accept="image/jpeg,image/png,image/webp"
                      disabled={vehicleImageUpload.isPending}
                      error={vehicleImageUpload.error}
                      isUploading={vehicleImageUpload.isPending}
                      onFileSelect={(file) => vehicleImageUpload.mutate(file)}
                      previewAlt="Vehicle image preview"
                      previewUrl={imageUrl}
                      value={imageUrl}
                    />
                  </Field>
                  <Field error={form.formState.errors.documentsJson?.message} label="Vehicle documents">
                    <FileUploadControl
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      disabled={vehicleDocumentUpload.isPending}
                      error={vehicleDocumentUpload.error}
                      isUploading={vehicleDocumentUpload.isPending}
                      onFileSelect={(file) => vehicleDocumentUpload.mutate(file)}
                      value={documentsJson}
                    />
                  </Field>
                </div>
              </section>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button disabled={createMutation.isPending || updateMutation.isPending} type="submit">
                  <Save aria-hidden="true" className="size-4" />
                  {editing ? "Save vehicle" : "Add vehicle"}
                </Button>
                {editing ? <Button onClick={() => setEditing(null)} type="button" variant="secondary">Cancel</Button> : null}
              </div>
            </form>
          </Surface>
        ) : (
          <Surface>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl"><Truck aria-hidden="true" className="size-5 text-primary" /></div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.28px]">Read-only vehicle view</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Company drivers can inspect fleet records, while admin controls stay hidden.</p>
          </Surface>
        )}

        <Surface>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">Vehicle registry</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {isDeletedView ? "Restore deleted fleet records from this dedicated view." : "Showing active, non-deleted vehicles returned by the backend."}
              </p>
            </div>
            {canManage ? (
              <div className="inline-flex w-fit rounded-lg border border-border bg-surface-pearl p-1" aria-label="Fleet vehicle registry view">
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
          </div>
          <div className="mt-5">
            {vehicles.length === 0 ? (
              <EmptyState
                description={isDeletedView ? "Deleted fleet vehicles will appear here after admins remove them from the active registry." : "Add a company vehicle to start assigning drivers."}
                title={isDeletedView ? "No deleted vehicles" : "No vehicles yet"}
              />
            ) : (
              <Table>
                <thead><tr><Th>Vehicle</Th><Th>Capabilities</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
                <tbody>
                  {vehicles.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <Td>
                        <p className="font-semibold">{vehicle.plateNumber} - {vehicle.countryOfRegistration}</p>
                        <p className="mt-1 text-xs text-muted">{[vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" ") || vehicle.vehicleType}</p>
                      </Td>
                      <Td>
                        <p>{[vehicle.bodyType, vehicle.capacityKg ? `${vehicle.capacityKg} kg` : null, vehicle.volumeM3 ? `${vehicle.volumeM3} m3` : null, vehicle.refrigerated ? "Refrigerated" : null, vehicle.hazmatCertified ? "Hazmat" : null].filter(Boolean).join(" - ") || "No capabilities"}</p>
                        <p className="mt-1 text-xs text-muted">{[vehicle.imageUrl ? "Image added" : null, vehicle.documentsJson ? "Documents noted" : null].filter(Boolean).join(" - ") || "No media"}</p>
                      </Td>
                      <Td><StatusBadge tone={isDeletedView ? "danger" : vehicle.isActive ? "success" : "warning"}>{isDeletedView ? "Deleted" : vehicle.isActive ? "Active" : "Inactive"}</StatusBadge></Td>
                      <Td>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            {isDeletedView ? (
                              <Tooltip label="Restore vehicle">
                                <Button
                                  aria-label={`Restore ${vehicle.plateNumber}`}
                                  className="h-9 min-h-9 px-3"
                                  disabled={restoreMutation.isPending}
                                  onClick={() => restoreMutation.mutate(vehicle.id)}
                                  type="button"
                                  variant="secondary"
                                >
                                  <RotateCcw aria-hidden="true" className="size-4" />
                                  Restore
                                </Button>
                              </Tooltip>
                            ) : (
                              <>
                                <Tooltip label="Edit vehicle">
                                  <Button aria-label={`Edit ${vehicle.plateNumber}`} className="h-9 min-h-9 px-3" onClick={() => setEditing(vehicle)} type="button" variant="secondary">
                                    <Pencil aria-hidden="true" className="size-4" />
                                    Edit
                                  </Button>
                                </Tooltip>
                                <Tooltip label="Delete vehicle">
                                  <Button aria-label={`Delete ${vehicle.plateNumber}`} className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(vehicle.id)} type="button" variant="danger">
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
                  ))}
                </tbody>
              </Table>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

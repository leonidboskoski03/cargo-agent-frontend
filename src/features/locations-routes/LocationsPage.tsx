import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, MapPin, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { listSupportedCities, listSupportedCountries } from "@/shared/api/modules/geo";
import { createLocation, deleteLocation, listLocations, restoreLocation, updateLocation, type Location } from "@/shared/api/modules/locationsRoutes";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageCompanyPosts } from "@/features/posts/postPermissions";
import { locationSchema, type LocationFormInput, type LocationFormValues } from "./routeSchemas";

const defaults: LocationFormInput = { city: "", countryCode: "", lat: "", lng: "", postalCode: "", region: "" };

function toForm(location: Location): LocationFormInput {
  return {
    city: location.city,
    countryCode: location.countryCode,
    lat: location.lat ?? "",
    lng: location.lng ?? "",
    postalCode: location.postalCode ?? "",
    region: location.region ?? "",
  };
}

export function LocationsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageCompanyPosts(user?.role);
  const [editing, setEditing] = useState<Location | null>(null);
  const [deleted, setDeleted] = useState<Location | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Location | null>(null);
  const [page, setPage] = useState(1);
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");
  const locationsQuery = useQuery({
    queryFn: () => listLocations({ deleted: registryView === "deleted" ? "only" : "active" }),
    queryKey: ["locations", registryView],
  });
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"], staleTime: 1000 * 60 * 30 });
  const form = useForm<LocationFormInput, unknown, LocationFormValues>({ defaultValues: defaults, resolver: zodResolver(locationSchema) });
  const editForm = useForm<LocationFormInput, unknown, LocationFormValues>({ defaultValues: defaults, resolver: zodResolver(locationSchema) });
  const countryCode = useWatch({ control: form.control, name: "countryCode" });
  const editCountryCode = useWatch({ control: editForm.control, name: "countryCode" });
  const citiesQuery = useQuery({
    enabled: Boolean(countryCode),
    queryFn: () => listSupportedCities({ countryCode, pageSize: 50 }),
    queryKey: ["geo", "cities", countryCode],
    staleTime: 1000 * 60 * 30,
  });
  const editCitiesQuery = useQuery({
    enabled: Boolean(editCountryCode),
    queryFn: () => listSupportedCities({ countryCode: editCountryCode, pageSize: 50 }),
    queryKey: ["geo", "cities", editCountryCode, "edit"],
    staleTime: 1000 * 60 * 30,
  });
  const countryRegistration = form.register("countryCode");
  const cityRegistration = form.register("city");
  const editCountryRegistration = editForm.register("countryCode");
  const editCityRegistration = editForm.register("city");

  useEffect(() => {
    if (editing) editForm.reset(toForm(editing));
  }, [editForm, editing]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["locations"] });
  const createMutation = useAppMutation({ messages: { success: "Location created" }, mutationFn: createLocation, onSuccess: () => { form.reset(defaults); void refresh(); } });
  const updateMutation = useAppMutation({ messages: { success: "Location updated" }, mutationFn: (values: LocationFormValues) => updateLocation(editing?.id ?? "", values), onSuccess: () => { setEditing(null); editForm.reset(defaults); void refresh(); } });
  const deleteMutation = useAppMutation({ messages: { success: "Location deleted" }, mutationFn: deleteLocation, onSuccess: (record) => { setDeleted(record); void refresh(); } });
  const restoreMutation = useAppMutation({ messages: { success: "Location restored" }, mutationFn: restoreLocation, onSuccess: () => { setDeleted(null); void refresh(); } });

  if (locationsQuery.isLoading) return <LoadingState description="Loading company route locations." title="Loading locations" />;
  if (locationsQuery.error) return <ErrorState description="Location data could not be loaded." error={locationsQuery.error} title="Unable to load locations" />;

  const countries = countriesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const editCities = editCitiesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const isDeletedView = registryView === "deleted";
  const pageCount = Math.max(1, Math.ceil(locations.length / 5));
  const activePage = Math.min(page, pageCount);
  const visibleLocations = locations.slice((activePage - 1) * 5, activePage * 5);

  return (
    <div className="space-y-3">
      <PageHeader subtitle="Manage reusable origin and destination points before creating company routes." title="Locations" />

      {deleted && canManage ? (
        <Surface className="flex flex-col gap-3 border-amber-200 bg-amber-50 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-amber-800">Deleted {deleted.city}, {deleted.countryCode}. Restore is available until this context changes.</p>
          <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(deleted.id)} type="button" variant="secondary"><RotateCcw className="size-4" /> Restore</Button>
        </Surface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.36fr_0.64fr]">
        {canManage ? (
          <Surface>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">Create location</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Use supported countries and city recommendations to avoid messy route data.</p>
              </div>
              <Field error={form.formState.errors.countryCode} label="Country" required>
                <Select
                  {...countryRegistration}
                  onChange={(event) => {
                    void countryRegistration.onChange(event);
                    form.setValue("city", "", { shouldDirty: true });
                    form.setValue("region", "", { shouldDirty: true });
                    form.setValue("lat", "", { shouldDirty: true });
                    form.setValue("lng", "", { shouldDirty: true });
                  }}
                >
                  <option value="">Select country</option>
                  {countries.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
                </Select>
              </Field>
              <Field error={form.formState.errors.city} label="City" required>
                <Select
                  disabled={!countryCode || citiesQuery.isLoading}
                  {...cityRegistration}
                  onChange={(event) => {
                    void cityRegistration.onChange(event);
                    const city = cities.find((item) => item.name === event.target.value);
                    form.setValue("region", city?.region ?? "", { shouldDirty: true });
                    form.setValue("lat", city?.lat ?? "", { shouldDirty: true });
                    form.setValue("lng", city?.lng ?? "", { shouldDirty: true });
                  }}
                >
                  <option value="">{countryCode ? "Select city" : "Select country first"}</option>
                  {cities.map((city) => <option key={city.id} value={city.name}>{city.name}{city.region ? `, ${city.region}` : ""}</option>)}
                </Select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field error={form.formState.errors.region} label="Region"><Input {...form.register("region")} /></Field>
                <Field error={form.formState.errors.postalCode} label="Postal code"><Input {...form.register("postalCode")} /></Field>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button disabled={createMutation.isPending} type="submit"><Save className="size-4" /> Add location</Button>
              </div>
            </form>
          </Surface>
        ) : (
          <Surface>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl"><MapPin className="size-5 text-primary" /></div>
            <h2 className="mt-4 text-2xl font-semibold">Read-only locations</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Drivers can inspect route dependencies, while admins manage records.</p>
          </Surface>
        )}

        <Surface>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-normal">Location registry</h2>
              <p className="mt-1 text-sm text-muted">Showing up to 5 {isDeletedView ? "deleted" : "active"} locations per page.</p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              {canManage ? (
                <div className="inline-flex rounded-lg border border-border bg-surface-pearl p-1" aria-label="Location registry view">
                  <Button
                    aria-pressed={!isDeletedView}
                    className="min-h-8 px-3 py-1 text-sm"
                    onClick={() => {
                      setRegistryView("active");
                      setPage(1);
                    }}
                    type="button"
                    variant={!isDeletedView ? "secondary" : "ghost"}
                  >
                    Active
                  </Button>
                  <Button
                    aria-pressed={isDeletedView}
                    className="min-h-8 px-3 py-1 text-sm"
                    onClick={() => {
                      setRegistryView("deleted");
                      setPage(1);
                    }}
                    type="button"
                    variant={isDeletedView ? "secondary" : "ghost"}
                  >
                    Deleted
                  </Button>
                </div>
              ) : null}
              {locations.length > 0 ? <p className="text-sm text-muted">{locations.length} {isDeletedView ? "deleted" : "active"}</p> : null}
            </div>
          </div>
          <div className="mt-5 min-h-[360px]">
            {locations.length === 0 ? (
              <EmptyState
                description={isDeletedView ? "Deleted location records will appear here when admins remove them from the active registry." : "Create locations before building company routes."}
                title={isDeletedView ? "No deleted locations" : "No active locations yet"}
              />
            ) : (
              <div className="space-y-3">
                <Table>
                  <thead><tr><Th>City</Th><Th>Country</Th><Th>Region</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
                  <tbody>
                    {visibleLocations.map((location) => (
                      <tr key={location.id}>
                        <Td className="font-semibold">{location.city}</Td>
                        <Td>{location.countryCode}</Td>
                        <Td>{location.region ?? "Not set"}</Td>
                        <Td><StatusBadge tone={isDeletedView ? "danger" : "success"}>{isDeletedView ? "Deleted" : "Active"}</StatusBadge></Td>
                        <Td className="text-right">
                          {canManage ? (
                            <div className="flex justify-end gap-1.5">
                              {isDeletedView ? (
                                <Tooltip label="Restore location">
                                  <Button
                                    aria-label={`Restore ${location.city}`}
                                    className="size-9 min-h-9 px-0"
                                    disabled={restoreMutation.isPending}
                                    onClick={() => restoreMutation.mutate(location.id)}
                                    type="button"
                                    variant="secondary"
                                  >
                                    <RotateCcw className="size-4" />
                                  </Button>
                                </Tooltip>
                              ) : (
                                <>
                                  <Tooltip label="Edit location">
                                    <Button
                                      aria-label={`Edit ${location.city}`}
                                      className="size-9 min-h-9 px-0"
                                      onClick={() => setEditing(location)}
                                      type="button"
                                      variant="secondary"
                                    >
                                      <Pencil className="size-4" />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Delete location">
                                    <Button
                                      aria-label={`Delete ${location.city}`}
                                      className="size-9 min-h-9 px-0"
                                      disabled={deleteMutation.isPending}
                                      onClick={() => setConfirmDelete(location)}
                                      type="button"
                                      variant="danger"
                                    >
                                      <Trash2 className="size-4" />
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
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted">Page {activePage} of {pageCount}</p>
                  <div className="flex items-center gap-2">
                    <Button className="min-h-8 px-3 py-1 text-sm" disabled={activePage === 1} onClick={() => setPage(Math.max(1, activePage - 1))} type="button" variant="ghost">Previous</Button>
                    <Button className="min-h-8 px-3 py-1 text-sm" disabled={activePage === pageCount} onClick={() => setPage(Math.min(pageCount, activePage + 1))} type="button" variant="ghost">Next</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Surface>
      </div>
      {editing ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4" role="dialog" aria-modal="true" aria-labelledby="edit-location-title">
          <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold tracking-normal" id="edit-location-title">Edit location</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  Update {editing.city}, {editing.countryCode}. Route data will keep using this location record.
                </p>
              </div>
              <Tooltip label="Close">
                <Button
                  aria-label="Close edit location"
                  className="size-9 min-h-9 px-0"
                  onClick={() => {
                    setEditing(null);
                    editForm.reset(defaults);
                  }}
                  type="button"
                  variant="ghost"
                >
                  <X className="size-4" />
                </Button>
              </Tooltip>
            </div>
            <form className="mt-5 space-y-4" onSubmit={editForm.handleSubmit((values) => updateMutation.mutate(values))}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field error={editForm.formState.errors.countryCode} label="Country" required>
                  <Select
                    {...editCountryRegistration}
                    onChange={(event) => {
                      void editCountryRegistration.onChange(event);
                      editForm.setValue("city", "", { shouldDirty: true });
                      editForm.setValue("region", "", { shouldDirty: true });
                      editForm.setValue("lat", "", { shouldDirty: true });
                      editForm.setValue("lng", "", { shouldDirty: true });
                    }}
                  >
                    <option value="">Select country</option>
                    {countries.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
                  </Select>
                </Field>
                <Field error={editForm.formState.errors.city} label="City" required>
                  <Select
                    disabled={!editCountryCode || editCitiesQuery.isLoading}
                    {...editCityRegistration}
                    onChange={(event) => {
                      void editCityRegistration.onChange(event);
                      const city = editCities.find((item) => item.name === event.target.value);
                      editForm.setValue("region", city?.region ?? "", { shouldDirty: true });
                      editForm.setValue("lat", city?.lat ?? "", { shouldDirty: true });
                      editForm.setValue("lng", city?.lng ?? "", { shouldDirty: true });
                    }}
                  >
                    <option value="">{editCountryCode ? "Select city" : "Select country first"}</option>
                    {editCities.map((city) => <option key={city.id} value={city.name}>{city.name}{city.region ? `, ${city.region}` : ""}</option>)}
                  </Select>
                </Field>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field error={editForm.formState.errors.region} label="Region"><Input {...editForm.register("region")} /></Field>
                <Field error={editForm.formState.errors.postalCode} label="Postal code"><Input {...editForm.register("postalCode")} /></Field>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => {
                    setEditing(null);
                    editForm.reset(defaults);
                  }}
                  type="button"
                  variant="ghost"
                >
                  Cancel
                </Button>
                <Button disabled={updateMutation.isPending} type="submit">
                  <Save className="size-4" /> Save location
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
      {confirmDelete ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-4" role="dialog" aria-modal="true" aria-labelledby="delete-location-title">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-red-50 text-danger">
                <AlertTriangle className="size-5" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-normal" id="delete-location-title">Delete location?</h2>
                <p className="mt-1 text-sm leading-6 text-muted">
                  {confirmDelete.city}, {confirmDelete.countryCode} will be removed from the active registry. You can restore it from Deleted locations.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button onClick={() => setConfirmDelete(null)} type="button" variant="ghost">Cancel</Button>
              <Button
                disabled={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                type="button"
                variant="danger"
              >
                <Trash2 className="size-4" /> Delete
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MapPin, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { listSupportedCities, listSupportedCountries } from "@/shared/api/modules/geo";
import { createLocation, deleteLocation, listLocations, restoreLocation, updateLocation, type Location } from "@/shared/api/modules/locationsRoutes";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
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
  const locationsQuery = useQuery({ queryFn: () => listLocations(), queryKey: ["locations"] });
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"], staleTime: 1000 * 60 * 30 });
  const form = useForm<LocationFormInput, unknown, LocationFormValues>({ defaultValues: defaults, resolver: zodResolver(locationSchema) });
  const countryCode = useWatch({ control: form.control, name: "countryCode" });
  const citiesQuery = useQuery({
    enabled: Boolean(countryCode),
    queryFn: () => listSupportedCities({ countryCode, pageSize: 50 }),
    queryKey: ["geo", "cities", countryCode],
    staleTime: 1000 * 60 * 30,
  });
  const cityRegistration = form.register("city");

  useEffect(() => {
    form.reset(editing ? toForm(editing) : defaults);
  }, [editing, form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["locations"] });
  const createMutation = useAppMutation({ messages: { success: "Location created" }, mutationFn: createLocation, onSuccess: () => { form.reset(defaults); void refresh(); } });
  const updateMutation = useAppMutation({ messages: { success: "Location updated" }, mutationFn: (values: LocationFormValues) => updateLocation(editing?.id ?? "", values), onSuccess: () => { setEditing(null); void refresh(); } });
  const deleteMutation = useAppMutation({ messages: { success: "Location deleted" }, mutationFn: deleteLocation, onSuccess: (record) => { setDeleted(record); void refresh(); } });
  const restoreMutation = useAppMutation({ messages: { success: "Location restored" }, mutationFn: restoreLocation, onSuccess: () => { setDeleted(null); void refresh(); } });

  if (locationsQuery.isLoading) return <LoadingState description="Loading company route locations." title="Loading locations" />;
  if (locationsQuery.error) return <ErrorState description="Location data could not be loaded." error={locationsQuery.error} title="Unable to load locations" />;

  const countries = countriesQuery.data ?? [];
  const cities = citiesQuery.data ?? [];
  const locations = locationsQuery.data ?? [];

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
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => editing ? updateMutation.mutate(values) : createMutation.mutate(values))}>
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">{editing ? "Edit location" : "Create location"}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Use supported countries and city recommendations to avoid messy route data.</p>
              </div>
              <Field error={form.formState.errors.countryCode} label="Country" required>
                <Select {...form.register("countryCode", { onChange: () => form.setValue("city", "", { shouldDirty: true }) })}>
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
                <Button disabled={createMutation.isPending || updateMutation.isPending} type="submit"><Save className="size-4" /> {editing ? "Save location" : "Add location"}</Button>
                {editing ? <Button onClick={() => setEditing(null)} type="button" variant="secondary">Cancel</Button> : null}
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
          <h2 className="text-2xl font-semibold tracking-normal">Location registry</h2>
          <div className="mt-5">
            {locations.length === 0 ? (
              <EmptyState description="Create locations before building company routes." title="No locations yet" />
            ) : (
              <Table>
                <thead><tr><Th>City</Th><Th>Country</Th><Th>Coordinates</Th><Th>Status</Th><Th>Actions</Th></tr></thead>
                <tbody>
                  {locations.map((location) => (
                    <tr key={location.id}>
                      <Td className="font-semibold">{location.city}</Td>
                      <Td>{location.countryCode}</Td>
                      <Td>{location.lat && location.lng ? `${location.lat}, ${location.lng}` : "Not set"}</Td>
                      <Td><StatusBadge tone="success">ACTIVE</StatusBadge></Td>
                      <Td>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Button className="h-9 min-h-9 px-4" onClick={() => setEditing(location)} type="button" variant="secondary">Edit</Button>
                            <Button className="h-9 min-h-9 px-4" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(location.id)} type="button" variant="danger"><Trash2 className="size-4" /> Delete</Button>
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

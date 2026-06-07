import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranchPlus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toApiClientError } from "@/shared/api/apiClient";
import { createRoute, deleteRoute, estimateRoute, listLocations, listRoutes, restoreRoute, updateRoute, type RouteRecord } from "@/shared/api/modules/locationsRoutes";
import { Button } from "@/shared/components/ui/Button";
import { Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageCompanyPosts } from "@/features/posts/postPermissions";
import { routeSchema, type RouteFormInput, type RouteFormValues } from "./routeSchemas";

const routeDefaults: RouteFormInput = { destinationLocationId: "", distanceKm: "", estimatedDurationMinutes: "", originLocationId: "" };

function locationLabel(location?: { city: string; countryCode: string }) {
  return location ? `${location.city}, ${location.countryCode}` : "Unknown";
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return "Not set";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

function toRouteForm(route: RouteRecord): RouteFormInput {
  return {
    destinationLocationId: route.destinationLocationId,
    distanceKm: route.distanceKm ? String(route.distanceKm) : "",
    estimatedDurationMinutes: route.estimatedDurationMinutes ? String(route.estimatedDurationMinutes) : "",
    originLocationId: route.originLocationId,
  };
}

export function RoutesPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageCompanyPosts(user?.role);
  const [editing, setEditing] = useState<RouteRecord | null>(null);
  const [deleted, setDeleted] = useState<RouteRecord | null>(null);
  const locationsQuery = useQuery({ queryFn: () => listLocations(), queryKey: ["locations"] });
  const routesQuery = useQuery({ queryFn: () => listRoutes(), queryKey: ["routes"] });
  const form = useForm<RouteFormInput, unknown, RouteFormValues>({ resolver: zodResolver(routeSchema), defaultValues: routeDefaults });
  const selectedOriginLocationId = useWatch({ control: form.control, name: "originLocationId" });
  const selectedDestinationLocationId = useWatch({ control: form.control, name: "destinationLocationId" });

  useEffect(() => {
    form.reset(editing ? toRouteForm(editing) : routeDefaults);
  }, [editing, form]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["routes"] });
  const createMutation = useAppMutation({ messages: { success: "Route created" }, mutationFn: createRoute, onSuccess: () => { form.reset(routeDefaults); void refresh(); } });
  const updateMutation = useAppMutation({ messages: { success: "Route updated" }, mutationFn: (values: RouteFormValues) => updateRoute(editing?.id ?? "", values), onSuccess: () => { setEditing(null); void refresh(); } });
  const deleteMutation = useAppMutation({ messages: { success: "Route deleted" }, mutationFn: deleteRoute, onSuccess: (record) => { setDeleted(record); void refresh(); } });
  const restoreMutation = useAppMutation({ messages: { success: "Route restored" }, mutationFn: restoreRoute, onSuccess: () => { setDeleted(null); void refresh(); } });
  const estimateMutation = useMutation({
    mutationFn: estimateRoute,
    onSuccess: (estimate) => {
      form.setValue("distanceKm", String(estimate.distanceKm), { shouldDirty: true, shouldValidate: true });
      form.setValue("estimatedDurationMinutes", String(estimate.estimatedDurationMinutes), { shouldDirty: true, shouldValidate: true });
    },
  });
  const estimateForSelection = estimateMutation.mutate;

  useEffect(() => {
    if (!selectedOriginLocationId || !selectedDestinationLocationId || selectedOriginLocationId === selectedDestinationLocationId) return;
    estimateForSelection({ destinationLocationId: selectedDestinationLocationId, originLocationId: selectedOriginLocationId, vehicleProfile: "TRUCK" });
  }, [estimateForSelection, selectedDestinationLocationId, selectedOriginLocationId]);

  if (locationsQuery.isLoading || routesQuery.isLoading) return <LoadingState description="Loading route dependencies." title="Loading routes" />;
  if (locationsQuery.error || routesQuery.error) return <ErrorState description="Route data could not be loaded." error={locationsQuery.error ?? routesQuery.error} title="Unable to load routes" />;

  const locations = locationsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const estimateError = estimateMutation.error ? toApiClientError(estimateMutation.error) : null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Route planning" subtitle="Build company-private origin and destination lanes from reusable locations." title="Routes" />

      {deleted && canManage ? (
        <Surface className="flex flex-col gap-3 border-amber-200 bg-amber-50 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-amber-800">Deleted {locationLabel(deleted.originLocation)} to {locationLabel(deleted.destinationLocation)}.</p>
          <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(deleted.id)} type="button" variant="secondary"><RotateCcw className="size-4" /> Restore</Button>
        </Surface>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[0.36fr_0.64fr]">
        {canManage ? (
          <Surface>
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => editing ? updateMutation.mutate(values) : createMutation.mutate(values))}>
              <div>
                <h2 className="text-2xl font-semibold tracking-normal">{editing ? "Edit route" : "Create route"}</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Choose locations, then let truck distance and duration estimate when configured.</p>
              </div>
              <Field error={form.formState.errors.originLocationId} label="Origin" required>
                <Select {...form.register("originLocationId")}><option value="">Select origin</option>{locations.map((location) => <option key={location.id} value={location.id}>{locationLabel(location)}</option>)}</Select>
              </Field>
              <Field error={form.formState.errors.destinationLocationId} label="Destination" required>
                <Select {...form.register("destinationLocationId")}><option value="">Select destination</option>{locations.map((location) => <option key={location.id} value={location.id}>{locationLabel(location)}</option>)}</Select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field error={form.formState.errors.distanceKm} label="Distance km"><Input {...form.register("distanceKm")} inputMode="numeric" type="number" /></Field>
                <Field error={form.formState.errors.estimatedDurationMinutes} label="Duration minutes"><Input {...form.register("estimatedDurationMinutes")} inputMode="numeric" type="number" /></Field>
              </div>
              {estimateMutation.isPending ? <p className="text-xs text-muted">Calculating truck route...</p> : null}
              {estimateError ? <p className="text-xs text-muted">Auto-estimate unavailable: {estimateError.message}{estimateError.traceId ? ` Trace ID: ${estimateError.traceId}` : ""}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button disabled={createMutation.isPending || updateMutation.isPending || locations.length < 2} type="submit"><Save className="size-4" /> {editing ? "Save route" : "Add route"}</Button>
                {editing ? <Button onClick={() => setEditing(null)} type="button" variant="secondary">Cancel</Button> : null}
              </div>
            </form>
          </Surface>
        ) : (
          <Surface>
            <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl"><GitBranchPlus className="size-5 text-primary" /></div>
            <h2 className="mt-4 text-2xl font-semibold">Read-only routes</h2>
            <p className="mt-2 text-sm leading-6 text-muted">Drivers can inspect company route lanes without mutation controls.</p>
          </Surface>
        )}

        <Surface>
          <h2 className="text-2xl font-semibold tracking-normal">Route registry</h2>
          <div className="mt-5">
            {routes.length === 0 ? (
              <EmptyState description="Create at least two locations, then connect them as a route before publishing transport posts." title="No routes yet" />
            ) : (
              <Table>
                <thead><tr><Th>Origin</Th><Th>Destination</Th><Th>Distance</Th><Th>Duration</Th><Th>Actions</Th></tr></thead>
                <tbody>
                  {routes.map((route) => (
                    <tr key={route.id}>
                      <Td>{locationLabel(route.originLocation)}</Td>
                      <Td>{locationLabel(route.destinationLocation)}</Td>
                      <Td>{route.distanceKm ? `${route.distanceKm} km` : "Not set"}</Td>
                      <Td>{formatDuration(route.estimatedDurationMinutes)}</Td>
                      <Td>
                        {canManage ? (
                          <div className="flex flex-wrap gap-2">
                            <Button className="h-9 min-h-9 px-4" onClick={() => setEditing(route)} type="button" variant="secondary">Edit</Button>
                            <Button className="h-9 min-h-9 px-4" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(route.id)} type="button" variant="danger"><Trash2 className="size-4" /> Delete</Button>
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

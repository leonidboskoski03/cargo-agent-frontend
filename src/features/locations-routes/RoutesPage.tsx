import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranchPlus, Map, Pencil, RotateCcw, Save, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toApiClientError } from "@/shared/api/apiClient";
import { createRoute, deleteRoute, estimateRoute, listLocations, listRoutes, restoreRoute, updateRoute, type RouteRecord } from "@/shared/api/modules/locationsRoutes";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageCompanyPosts } from "@/features/posts/postPermissions";
import { RouteConnectionMap } from "./RouteConnectionMap";
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
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [routePage, setRoutePage] = useState(1);
  const locationsQuery = useQuery({ queryFn: () => listLocations(), queryKey: ["locations"] });
  const routesQuery = useQuery({
    queryFn: () => listRoutes({ deleted: registryView === "deleted" ? "only" : "active" }),
    queryKey: ["routes", registryView],
  });
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
  const isDeletedView = registryView === "deleted";
  const estimateError = estimateMutation.error ? toApiClientError(estimateMutation.error) : null;
  const selectedRoute = routes.find((route) => route.id === selectedRouteId) ?? null;
  const selectedOrigin = locations.find((location) => location.id === selectedOriginLocationId);
  const selectedDestination = locations.find((location) => location.id === selectedDestinationLocationId);
  const draftRoute: RouteRecord | null = selectedOrigin && selectedDestination && selectedOrigin.id !== selectedDestination.id ? {
    createdAt: "",
    deletedAt: null,
    destinationLocation: selectedDestination,
    destinationLocationId: selectedDestination.id,
    distanceKm: null,
    estimatedDurationMinutes: null,
    id: "draft-route-preview",
    isActive: true,
    originLocation: selectedOrigin,
    originLocationId: selectedOrigin.id,
    updatedAt: "",
  } : null;
  const routePageCount = Math.max(1, Math.ceil(routes.length / 5));
  const activeRoutePage = Math.min(routePage, routePageCount);
  const visibleRoutes = routes.slice((activeRoutePage - 1) * 5, activeRoutePage * 5);

  function setRegistryMode(view: "active" | "deleted") {
    setRegistryView(view);
    setRoutePage(1);
    setEditing(null);
    setSelectedRouteId(null);
  }

  return (
    <div className="space-y-2">
      <PageHeader subtitle="Build company-private origin and destination lanes from reusable locations." title="Routes" />

      {deleted && canManage ? (
        <Surface className="flex flex-col gap-3 border-amber-200 bg-amber-50 md:flex-row md:items-center md:justify-between">
          <p className="text-sm font-semibold text-amber-800">Deleted {locationLabel(deleted.originLocation)} to {locationLabel(deleted.destinationLocation)}.</p>
          <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(deleted.id)} type="button" variant="secondary"><RotateCcw className="size-4" /> Restore</Button>
        </Surface>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.32fr)_1fr]">
        {canManage ? (
          <Surface className="p-4">
            <form className="space-y-3" onSubmit={form.handleSubmit((values) => editing ? updateMutation.mutate(values) : createMutation.mutate(values))}>
              <div>
                <h2 className="text-xl font-semibold tracking-normal">{editing ? "Edit route" : "Create route"}</h2>
                <p className="mt-1 text-sm leading-5 text-muted">Choose saved locations and let truck distance estimate when configured.</p>
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
              {estimateMutation.data ? (
                <p className="rounded-lg bg-surface-pearl px-3 py-2 text-xs font-semibold text-muted">
                  {estimateMutation.data.provider} / {estimateMutation.data.profile}: {estimateMutation.data.distanceKm} km, {formatDuration(estimateMutation.data.estimatedDurationMinutes)}
                </p>
              ) : null}
              {estimateError ? <p className="text-xs text-muted">Auto-estimate unavailable: {estimateError.message}{estimateError.traceId ? ` Trace ID: ${estimateError.traceId}` : ""}</p> : null}
              {draftRoute ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-muted">Draft lane preview</p>
                  <RouteConnectionMap className="h-[220px]" route={draftRoute} />
                </div>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button disabled={createMutation.isPending || updateMutation.isPending || locations.length < 2} type="submit"><Save className="size-4" /> {editing ? "Save route" : "Add route"}</Button>
                {editing ? <Button onClick={() => setEditing(null)} type="button" variant="secondary"><X className="size-4" /> Cancel</Button> : null}
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

        <Surface className="p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Route registry</h2>
              <p className="mt-1 text-sm text-muted">
                {isDeletedView ? "Restore deleted route lanes from this module view." : "Inspect lane maps only when needed to keep this workspace compact."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:items-end">
              {canManage ? (
                <div className="inline-flex w-fit rounded-lg border border-border bg-surface-pearl p-1" aria-label="Route registry view">
                  <Button
                    aria-pressed={!isDeletedView}
                    className="min-h-8 px-3 py-1 text-sm"
                    onClick={() => setRegistryMode("active")}
                    type="button"
                    variant={!isDeletedView ? "secondary" : "ghost"}
                  >
                    Active
                  </Button>
                  <Button
                    aria-pressed={isDeletedView}
                    className="min-h-8 px-3 py-1 text-sm"
                    onClick={() => setRegistryMode("deleted")}
                    type="button"
                    variant={isDeletedView ? "secondary" : "ghost"}
                  >
                    Deleted
                  </Button>
                </div>
              ) : null}
              {routes.length > 0 ? <p className="text-sm text-muted">{routes.length} total</p> : null}
            </div>
          </div>
          <div className="mt-4 min-h-[340px]">
            {routes.length === 0 ? (
              <EmptyState
                description={isDeletedView ? "Deleted routes will appear here after admins remove them from the active registry." : "Create at least two locations, then connect them as a route before publishing transport posts."}
                title={isDeletedView ? "No deleted routes" : "No routes yet"}
              />
            ) : (
              <div className="space-y-3">
                <Table>
                  <thead><tr><Th>Origin</Th><Th>Destination</Th><Th>Distance</Th><Th>Duration</Th><Th>Status</Th><Th className="text-right">Actions</Th></tr></thead>
                  <tbody>
                    {visibleRoutes.map((route) => (
                      <tr key={route.id}>
                        <Td>{locationLabel(route.originLocation)}</Td>
                        <Td>{locationLabel(route.destinationLocation)}</Td>
                        <Td>{route.distanceKm ? `${route.distanceKm} km` : "Not set"}</Td>
                        <Td>{formatDuration(route.estimatedDurationMinutes)}</Td>
                        <Td><StatusBadge tone={isDeletedView ? "danger" : route.isActive ? "success" : "warning"}>{isDeletedView ? "Deleted" : route.isActive ? "Active" : "Inactive"}</StatusBadge></Td>
                        <Td className="text-right">
                          {canManage ? (
                            <div className="flex justify-end gap-1.5">
                              <Tooltip label="Open route map">
                                <Button
                                  aria-label={`Open map for ${locationLabel(route.originLocation)} to ${locationLabel(route.destinationLocation)}`}
                                  className="size-9 min-h-9 px-0"
                                  onClick={() => setSelectedRouteId(route.id)}
                                  type="button"
                                  variant="secondary"
                                >
                                  <Map className="size-4" />
                                </Button>
                              </Tooltip>
                              {isDeletedView ? (
                                <Tooltip label="Restore route">
                                  <Button
                                    aria-label={`Restore route ${locationLabel(route.originLocation)} to ${locationLabel(route.destinationLocation)}`}
                                    className="size-9 min-h-9 px-0"
                                    disabled={restoreMutation.isPending}
                                    onClick={() => restoreMutation.mutate(route.id)}
                                    type="button"
                                    variant="secondary"
                                  >
                                    <RotateCcw className="size-4" />
                                  </Button>
                                </Tooltip>
                              ) : (
                                <>
                                  <Tooltip label="Edit route">
                                    <Button
                                      aria-label={`Edit route ${locationLabel(route.originLocation)} to ${locationLabel(route.destinationLocation)}`}
                                      className="size-9 min-h-9 px-0"
                                      onClick={() => setEditing(route)}
                                      type="button"
                                      variant="secondary"
                                    >
                                      <Pencil className="size-4" />
                                    </Button>
                                  </Tooltip>
                                  <Tooltip label="Delete route">
                                    <Button
                                      aria-label={`Delete route ${locationLabel(route.originLocation)} to ${locationLabel(route.destinationLocation)}`}
                                      className="size-9 min-h-9 px-0"
                                      disabled={deleteMutation.isPending}
                                      onClick={() => deleteMutation.mutate(route.id)}
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
                  <p className="text-xs text-muted">Page {activeRoutePage} of {routePageCount}</p>
                  <div className="flex items-center gap-2">
                    <Button className="min-h-8 px-3 py-1 text-sm" disabled={activeRoutePage === 1} onClick={() => setRoutePage(Math.max(1, activeRoutePage - 1))} type="button" variant="ghost">Previous</Button>
                    <Button className="min-h-8 px-3 py-1 text-sm" disabled={activeRoutePage === routePageCount} onClick={() => setRoutePage(Math.min(routePageCount, activeRoutePage + 1))} type="button" variant="ghost">Next</Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Surface>
      </div>
      {selectedRoute ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="route-map-title">
          <div className="w-full max-w-5xl rounded-xl border border-border bg-card p-4 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-muted">Route map</p>
                <h2 className="mt-1 text-xl font-semibold tracking-normal" id="route-map-title">
                  {locationLabel(selectedRoute.originLocation)} to {locationLabel(selectedRoute.destinationLocation)}
                </h2>
                <p className="mt-1 text-sm text-muted">Visual lane is fitted from coordinates. Distance and duration may come from truck routing when configured.</p>
              </div>
              <Tooltip label="Close map">
                <Button aria-label="Close route map" className="size-9 min-h-9 px-0" onClick={() => setSelectedRouteId(null)} type="button" variant="ghost">
                  <X className="size-4" />
                </Button>
              </Tooltip>
            </div>
            <RouteConnectionMap className="h-[min(62vh,520px)]" route={selectedRoute} />
          </div>
        </div>
      ) : null}
    </div>
  );
}

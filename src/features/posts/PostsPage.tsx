import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, Filter, GitBranchPlus, Pencil, Plus, Rocket, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { createRoute, listLocations, listRoutes, type Location, type RouteRecord } from "@/shared/api/modules/locationsRoutes";
import { boostPost, changePostStatus, createPost, deletePost, listPosts, restorePost, type PostRecord, type PostScope, type PostStatus } from "@/shared/api/modules/posts";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageCompanyPosts } from "./postPermissions";
import { postSchema, type PostFormInput, type PostFormValues } from "./postSchemas";

type PostsPageProps = {
  creationOnly?: boolean;
  fixedScope?: PostScope;
  mode?: "planned" | "quick";
};

const currencyOptions = ["EUR", "MKD", "USD", "BGN", "RSD", "ALL", "TRY", "RON", "BAM"];
const postStatuses: Array<PostStatus | "ALL"> = ["ALL", "DRAFT", "OPEN", "ASSIGNED", "ARCHIVED", "CANCELLED", "EXPIRED"];
const unfinishedStatuses: PostStatus[] = ["DRAFT", "ARCHIVED"];

type QuickRouteDraft = {
  destinationLocation: string;
  distanceKm: string;
  estimatedDurationMinutes: string;
  originLocation: string;
};

type QuickRouteValues = {
  destinationLocationId: string;
  distanceKm?: number;
  estimatedDurationMinutes?: number;
  originLocationId: string;
};

function formatPostRoute(post: PostRecord, routes: Awaited<ReturnType<typeof listRoutes>>) {
  if (post.route) {
    return `${post.route.originLocation.city}, ${post.route.originLocation.countryCode} -> ${post.route.destinationLocation.city}, ${post.route.destinationLocation.countryCode}`;
  }
  const routeId = post.routeId;
  const route = routes.find((item) => item.id === routeId);
  if (!route) return routeId.slice(0, 8);
  return `${route.originLocation.city} -> ${route.destinationLocation.city}`;
}

function postTone(status: string) {
  if (status === "OPEN") return "success";
  if (status === "ASSIGNED") return "warning";
  if (status === "CANCELLED") return "danger";
  return "neutral";
}

function isPostBoosted(post: PostRecord) {
  return Boolean(post.promotedUntil && new Date(post.promotedUntil) > new Date());
}

function locationOptionLabel(location: Location) {
  return `${location.city}, ${location.countryCode}${location.region ? ` (${location.region})` : ""}`;
}

function findLocationByLabel(locations: Location[], label: string) {
  const normalized = label.trim().toLowerCase();
  return locations.find((location) => locationOptionLabel(location).toLowerCase() === normalized);
}

function optionalNumber(value: string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function PostsPage({ creationOnly = false, fixedScope, mode = "planned" }: PostsPageProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [registryView, setRegistryView] = useState<"active" | "archived" | "deleted">("active");
  const [quickRouteDraft, setQuickRouteDraft] = useState<QuickRouteDraft>({
    destinationLocation: "",
    distanceKm: "",
    estimatedDurationMinutes: "",
    originLocation: "",
  });
  const [boostedPostTitle, setBoostedPostTitle] = useState<string | null>(null);
  const user = useAuthStore((state) => state.user);
  const isAdmin = canManageCompanyPosts(user?.role);
  const requestedScope = searchParams.get("scope");
  const scope: PostScope = fixedScope ?? (requestedScope === "mine" ? "mine" : "marketplace");
  const requestedStatus = searchParams.get("status");
  const status = scope === "mine" && postStatuses.includes(requestedStatus as PostStatus) && requestedStatus !== "ALL" ? requestedStatus as PostStatus : null;
  const selectedStatus = status ?? "ALL";
  const selectedRouteId = searchParams.get("routeId") ?? "";
  const search = searchParams.get("q") ?? "";
  const isDeletedView = scope === "mine" && registryView === "deleted";
  const isArchivedView = scope === "mine" && registryView === "archived";
  const postsQuery = useQuery({
    queryFn: () => listPosts({
      scope,
      ...(scope === "mine" ? { deleted: isDeletedView ? "only" : "active" } : {}),
      ...(status ? { status } : {}),
    }),
    queryKey: ["posts", scope, status ?? "ALL", scope === "mine" ? registryView : "active"],
  });
  const routesQuery = useQuery({ queryFn: () => listRoutes(), queryKey: ["routes"] });
  const locationsQuery = useQuery({
    enabled: mode === "quick" && isAdmin && scope === "mine",
    queryFn: () => listLocations(),
    queryKey: ["locations"],
  });
  const routes = routesQuery.data ?? [];
  const posts = postsQuery.data ?? [];
  const locations = locationsQuery.data ?? [];
  const filteredPosts = posts.filter((post) => {
    const searchNeedle = search.trim().toLowerCase();
    const matchesLifecycle = scope !== "mine" || isDeletedView || (isArchivedView ? unfinishedStatuses.includes(post.status) : !unfinishedStatuses.includes(post.status));
    const matchesRoute = scope === "marketplace" || !selectedRouteId || post.routeId === selectedRouteId;
    const matchesSearch = !searchNeedle || `${post.title ?? ""} ${post.cargoDescription ?? ""} ${post.description ?? ""}`.toLowerCase().includes(searchNeedle);
    return matchesLifecycle && matchesRoute && matchesSearch;
  });

  const updateFilter = (key: "q" | "routeId" | "scope" | "status", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    if (key === "scope") next.delete("routeId");
    setSearchParams(next);
  };

  const form = useForm<PostFormInput, unknown, PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      cargoDescription: "",
      cargoType: "",
      currency: "EUR",
      description: "",
      priceAmount: "",
      priceType: "REQUEST_QUOTE",
      routeId: "",
      title: "",
      weightKg: "",
    },
  });

  const createMutation = useAppMutation({
    messages: { success: "Transport post created" },
    mutationFn: createPost,
    onSuccess: (post) => {
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post created", { description: "Opening the post detail workspace." });
      navigate(`/posts/${post.id}`);
    },
  });
  const selectedPostRouteId = useWatch({ control: form.control, name: "routeId" });

  const statusMutation = useAppMutation({
    messages: { success: "Post status updated" },
    mutationFn: ({ postId, status }: { postId: string; status: "ARCHIVED" | "DRAFT" | "OPEN" }) => changePostStatus(postId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["posts"] }),
  });

  const boostMutation = useAppMutation({
    mutationFn: boostPost,
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      const title = post.title || post.cargoDescription || "Post";
      setBoostedPostTitle(title);
      window.setTimeout(() => setBoostedPostTitle(null), 2600);
      toast.success("Boost is live", { description: `${title} is promoted in the marketplace.` });
    },
  });

  const restoreMutation = useAppMutation({
    messages: { success: "Post restored" },
    mutationFn: restorePost,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deleteMutation = useAppMutation({
    mutationFn: deletePost,
    onSuccess: (post) => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      toast.success("Post deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreMutation.mutate(post.id),
        },
      });
    },
  });

  const inlineRouteMutation = useAppMutation<RouteRecord, QuickRouteValues>({
    messages: { success: "Route created" },
    mutationFn: createRoute,
    onSuccess: (route) => {
      setQuickRouteDraft({ destinationLocation: "", distanceKm: "", estimatedDurationMinutes: "", originLocation: "" });
      form.setValue("routeId", route.id, { shouldDirty: true, shouldValidate: true });
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  const createQuickRoute = () => {
    const origin = findLocationByLabel(locations, quickRouteDraft.originLocation);
    const destination = findLocationByLabel(locations, quickRouteDraft.destinationLocation);

    if (!origin || !destination) {
      toast.error("Select saved origin and destination locations from the suggestions.");
      return;
    }

    if (origin.id === destination.id) {
      toast.error("Origin and destination must be different.");
      return;
    }

    inlineRouteMutation.mutate({
      destinationLocationId: destination.id,
      distanceKm: optionalNumber(quickRouteDraft.distanceKm),
      estimatedDurationMinutes: optionalNumber(quickRouteDraft.estimatedDurationMinutes),
      originLocationId: origin.id,
    });
  };

  const createTransportPost = (values: PostFormValues, status: "DRAFT" | "OPEN" = "OPEN") => {
    createMutation.mutate({ ...values, status });
  };

  const setRegistryMode = (view: "active" | "archived" | "deleted") => {
    setRegistryView(view);
    const next = new URLSearchParams(searchParams);
    next.delete("status");
    setSearchParams(next);
  };

  if (postsQuery.isLoading || routesQuery.isLoading || locationsQuery.isLoading) {
    return <LoadingState description="Preparing posts, routes, and company marketplace data." title="Loading transport posts" />;
  }

  if (postsQuery.error || routesQuery.error || locationsQuery.error) {
    return (
      <ErrorState
        description="The frontend could not load the current marketplace workspace data."
        error={postsQuery.error ?? routesQuery.error ?? locationsQuery.error}
        title="Unable to load posts"
      />
    );
  }

  return (
    <div className="space-y-6">
      {boostedPostTitle ? (
        <div className="fixed right-5 top-20 z-50 w-[min(360px,calc(100vw-2rem))] rounded-xl border border-blue-100 bg-card p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="relative grid size-10 shrink-0 place-items-center rounded-lg bg-blue-50 text-primary">
              <Rocket className="size-5" aria-hidden="true" />
              <span className="absolute -right-1 -top-1 size-2 rounded-full bg-success" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Boost is live</p>
              <p className="mt-1 text-sm leading-5 text-muted">{boostedPostTitle} is promoted in the marketplace.</p>
            </div>
          </div>
        </div>
      ) : null}
      <PageHeader
        action={isAdmin && scope === "mine" && creationOnly ? <Button disabled={routes.length === 0 && mode === "planned"} form="create-post-form" type="submit"><Plus className="size-4" /> Create post</Button> : null}
        subtitle={scope === "marketplace" ? "Browse open transport demand from other companies and submit bids." : mode === "quick" ? "Create a route and post in one quick workflow." : "Reuse planned company routes for repeatable transport posts."}
        title={creationOnly ? (mode === "quick" ? "Quick route post" : "Create planned post") : scope === "marketplace" ? "Transport marketplace" : "My transport posts"}
      />

      {isAdmin && scope === "mine" && creationOnly ? (
        <Surface className="flex items-start gap-3 border-blue-100 bg-blue-50">
          <CreditCard className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Publishing uses included active-post quota first.</p>
            <p className="mt-1 text-sm leading-6 text-muted">Transport posts cost 2 company credits after the current plan quota is exceeded.</p>
          </div>
        </Surface>
      ) : null}

      {!creationOnly && scope === "mine" ? (
        <Surface className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Post registry</p>
              <p className="mt-1 text-sm text-muted">
                {isDeletedView
                  ? "Deleted transport posts stay private until restored."
                  : isArchivedView
                    ? "Draft and archived posts stay private until published."
                    : "Published company posts are available for status changes, boosts, and deletion."}
              </p>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-border bg-surface-pearl p-1" aria-label="Post registry view">
            <Button
              aria-pressed={!isDeletedView}
              className="min-h-8 px-3 py-1 text-sm"
                    onClick={() => setRegistryMode("active")}
              type="button"
              variant={!isDeletedView ? "secondary" : "ghost"}
            >
                Published
              </Button>
              <Button
                aria-pressed={isArchivedView}
                className="min-h-8 px-3 py-1 text-sm"
                onClick={() => setRegistryMode("archived")}
                type="button"
                variant={isArchivedView ? "secondary" : "ghost"}
              >
                Drafts
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
        </Surface>
      ) : null}

      {isAdmin && scope === "mine" && creationOnly ? (
        <div className="grid gap-5">
          {mode === "planned" ? (
            <Surface>
              <form className="grid gap-4 lg:grid-cols-3" id="create-post-form" onSubmit={form.handleSubmit((values) => createTransportPost(values))}>
                <div className="lg:col-span-2">
                  <Field error={form.formState.errors.title} label="Title">
                    <Input {...form.register("title")} placeholder="Skopje to Sofia load" />
                  </Field>
                </div>
                <Field error={form.formState.errors.routeId} label="Route" required>
                  <Select {...form.register("routeId")}>
                    <option value="">Select route</option>
                    {routes.map((route) => (
                      <option key={route.id} value={route.id}>
                        {route.originLocation.city} {"->"} {route.destinationLocation.city}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field error={form.formState.errors.weightKg} label="Weight kg">
                  <Input {...form.register("weightKg")} inputMode="numeric" type="number" />
                </Field>

                <Field error={form.formState.errors.priceType} label="Price type" required>
                  <Select {...form.register("priceType")}>
                    <option value="REQUEST_QUOTE">{humanizeEnum("REQUEST_QUOTE")}</option>
                    <option value="FIXED">{humanizeEnum("FIXED")}</option>
                    <option value="NEGOTIABLE">{humanizeEnum("NEGOTIABLE")}</option>
                  </Select>
                </Field>

                <div>
                  <Field error={form.formState.errors.priceAmount ?? form.formState.errors.currency} label="Price">
                    <div className="grid grid-cols-[1fr_0.5fr] rounded-lg border border-border bg-card shadow-sm focus-within:border-slate-300">
                      <input className="h-10 min-w-0 rounded-l-lg bg-transparent px-3 text-sm outline-none" {...form.register("priceAmount")} inputMode="decimal" placeholder="Amount" />
                      <Select className="rounded-l-none border-l border-border shadow-none" {...form.register("currency")}>
                        {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                      </Select>
                    </div>
                  </Field>
                </div>
                <div className="lg:col-span-3">
                  <Field error={form.formState.errors.cargoDescription} label="Cargo description">
                    <Textarea className="min-h-36 resize-none" {...form.register("cargoDescription")} placeholder="Describe cargo, constraints, and timing context." />
                  </Field>
                </div>
                <div className="lg:col-span-3">
                  <Button disabled={createMutation.isPending || routes.length === 0} type="submit">
                    <Plus className="size-4" />
                    Create post
                  </Button>
                  <Button disabled={createMutation.isPending || routes.length === 0} onClick={form.handleSubmit((values) => createTransportPost(values, "DRAFT"))} type="button" variant="secondary">
                    Save draft
                  </Button>
                </div>
              </form>
            </Surface>
          ) : null}

          {mode === "quick" ? (
            <Surface>
              <form className="grid gap-4 lg:grid-cols-2" id="create-post-form" onSubmit={form.handleSubmit((values) => createTransportPost(values))}>
                <div className="lg:col-span-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold tracking-normal">Route and post</h2>
                      <p className="mt-1 text-sm leading-5 text-muted">Pick saved locations, create the route, then publish the transport post from the same workflow.</p>
                    </div>
                    <Button disabled={inlineRouteMutation.isPending || locations.length < 2} onClick={createQuickRoute} type="button" variant="secondary">
                      <GitBranchPlus className="size-4" />
                      Create route
                    </Button>
                  </div>
                </div>

                <Field description="Start typing and choose one saved location from the suggestions." label="Origin" required>
                  <Input
                    list="quick-origin-locations"
                    onChange={(event) => setQuickRouteDraft((current) => ({ ...current, originLocation: event.target.value }))}
                    placeholder="Skopje, MK"
                    value={quickRouteDraft.originLocation}
                  />
                </Field>
                <Field description="Only existing backend locations are used in this quick flow." label="Destination" required>
                  <Input
                    list="quick-destination-locations"
                    onChange={(event) => setQuickRouteDraft((current) => ({ ...current, destinationLocation: event.target.value }))}
                    placeholder="Sofia, BG"
                    value={quickRouteDraft.destinationLocation}
                  />
                </Field>
                <datalist id="quick-origin-locations">
                  {locations.map((location) => <option key={location.id} value={locationOptionLabel(location)} />)}
                </datalist>
                <datalist id="quick-destination-locations">
                  {locations.map((location) => <option key={location.id} value={locationOptionLabel(location)} />)}
                </datalist>

                <Field label="Distance km">
                  <Input
                    inputMode="numeric"
                    onChange={(event) => setQuickRouteDraft((current) => ({ ...current, distanceKm: event.target.value }))}
                    type="number"
                    value={quickRouteDraft.distanceKm}
                  />
                </Field>
                <Field label="Duration minutes">
                  <Input
                    inputMode="numeric"
                    onChange={(event) => setQuickRouteDraft((current) => ({ ...current, estimatedDurationMinutes: event.target.value }))}
                    type="number"
                    value={quickRouteDraft.estimatedDurationMinutes}
                  />
                </Field>

                <Field error={form.formState.errors.routeId} label="Route" required>
                  <Select {...form.register("routeId")}><option value="">Create/select route first</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.originLocation.city} {"->"} {route.destinationLocation.city}</option>)}</Select>
                </Field>
                <Field error={form.formState.errors.title} label="Title"><Input {...form.register("title")} placeholder="Skopje to Sofia load" /></Field>
                <Field error={form.formState.errors.weightKg} label="Weight kg"><Input {...form.register("weightKg")} inputMode="numeric" type="number" /></Field>
                <Field error={form.formState.errors.priceType} label="Price type" required>
                  <Select {...form.register("priceType")}><option value="REQUEST_QUOTE">{humanizeEnum("REQUEST_QUOTE")}</option><option value="FIXED">{humanizeEnum("FIXED")}</option><option value="NEGOTIABLE">{humanizeEnum("NEGOTIABLE")}</option></Select>
                </Field>
                <Field error={form.formState.errors.priceAmount ?? form.formState.errors.currency} label="Price">
                  <div className="grid grid-cols-[1fr_7rem] rounded-lg border border-border bg-card shadow-sm focus-within:border-slate-300">
                    <input className="h-10 min-w-0 rounded-l-lg bg-transparent px-3 text-sm outline-none" {...form.register("priceAmount")} inputMode="decimal" placeholder="Amount" />
                    <Select className="rounded-l-none border-0 shadow-none" {...form.register("currency")}>{currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</Select>
                  </div>
                </Field>
                <div className="lg:col-span-2"><Field error={form.formState.errors.cargoDescription} label="Cargo description"><Textarea className="min-h-36 resize-none" {...form.register("cargoDescription")} placeholder="Describe cargo, constraints, and timing context." /></Field></div>
                <div className="flex flex-wrap gap-2 lg:col-span-2">
                  <Button disabled={createMutation.isPending || !selectedPostRouteId} type="submit"><Plus className="size-4" /> Create post</Button>
                  <Button disabled={createMutation.isPending || !selectedPostRouteId} onClick={form.handleSubmit((values) => createTransportPost(values, "DRAFT"))} type="button" variant="secondary">Save draft</Button>
                </div>
              </form>
            </Surface>
          ) : null}
        </div>
      ) : null}

      {creationOnly ? null : (
        <>
          <Surface>
            <div className="grid gap-4 lg:grid-cols-[0.7fr_0.45fr_0.45fr_auto] lg:items-end">
              <Field label="Search posts">
                <Input onChange={(event) => updateFilter("q", event.target.value)} placeholder="Cargo, title, description" value={search} />
              </Field>
              {scope === "mine" ? (
                <Field label="Status">
                  <Select onChange={(event) => updateFilter("status", event.target.value)} value={selectedStatus}>
                    {postStatuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : humanizeEnum(item)}</option>)}
                  </Select>
                </Field>
              ) : null}
              {scope === "mine" ? (
                <Field label="Route">
                  <Select onChange={(event) => updateFilter("routeId", event.target.value)} value={selectedRouteId}>
                    <option value="">All routes</option>
                    {routes.map((route) => <option key={route.id} value={route.id}>{route.originLocation.city} {"->"} {route.destinationLocation.city}</option>)}
                  </Select>
                </Field>
              ) : null}
              <Button onClick={() => setSearchParams(new URLSearchParams())} type="button" variant="secondary">
                <Filter className="size-4" aria-hidden="true" />
                Clear
              </Button>
            </div>
          </Surface>

          {scope === "mine" && !isDeletedView && routes.length === 0 ? (
            <EmptyState
              action={isAdmin ? <Link className="inline-flex min-h-10 items-center rounded-lg border border-primary bg-card px-4 py-2 text-sm text-primary" to="/routes">Create routes first</Link> : null}
              description={isAdmin ? "A backend route is required before a transport post can be created." : "Your company has not created routes yet. Ask an admin to configure operational routes."}
              title="Routes are required"
            />
          ) : filteredPosts.length === 0 ? (
            <EmptyState
              description={posts.length === 0 ? (scope === "marketplace" ? "No other companies have open transport posts right now." : isDeletedView ? "Deleted company posts will appear here after admins remove them from the active registry." : isArchivedView ? "Draft and archived posts will appear here when admins save or archive unfinished work." : "Create the first transport post to start receiving and managing bids.") : "No posts match the current status, route, or search filters."}
              title={posts.length === 0 ? (scope === "marketplace" ? "No marketplace posts" : isDeletedView ? "No deleted posts" : isArchivedView ? "No drafts or archived posts" : "No posts yet") : "No matching posts"}
            />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Title</Th>
                  <Th>Route</Th>
                  <Th>Status</Th>
                  <Th>Price</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr
                    className="cursor-pointer transition hover:bg-surface-pearl focus:outline-none focus-visible:bg-surface-pearl focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-inset"
                    key={post.id}
                    onClick={() => navigate(`/posts/${post.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        navigate(`/posts/${post.id}`);
                      }
                    }}
                    tabIndex={0}
                  >
                    <Td>
                      <Link className="font-semibold text-primary" onClick={(event) => event.stopPropagation()} to={`/posts/${post.id}`}>
                        {post.title || post.cargoDescription || "Untitled post"}
                      </Link>
                      {isPostBoosted(post) ? <span className="ml-2 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-primary">Boosted</span> : null}
                    </Td>
                    <Td>{formatPostRoute(post, routes)}</Td>
                    <Td><StatusBadge tone={isDeletedView ? "danger" : postTone(post.status)}>{isDeletedView ? "Deleted" : humanizeEnum(post.status)}</StatusBadge></Td>
                    <Td>{post.priceAmount ? `${post.priceAmount} ${post.currency}` : humanizeEnum(post.priceType)}</Td>
                    <Td>
                      {isAdmin && post.companyId === user?.companyId ? (
                        <div className="flex flex-wrap gap-2" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                          {!isDeletedView && ["DRAFT", "OPEN", "ARCHIVED"].includes(post.status) ? (
                            <Tooltip label="Edit post">
                              <Link
                                className="inline-flex h-9 min-h-9 items-center justify-center gap-2 rounded-lg border border-primary bg-card px-3 py-2 text-sm font-normal text-primary transition hover:bg-surface-pearl"
                                to={`/posts/${post.id}/edit`}
                              >
                                <Pencil className="size-4" />
                                Edit
                              </Link>
                            </Tooltip>
                          ) : null}
                          {isDeletedView ? (
                            <Tooltip label="Restore post">
                              <Button className="h-9 min-h-9 px-3" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(post.id)} type="button" variant="secondary">
                                <RotateCcw className="size-4" />
                                Restore
                              </Button>
                            </Tooltip>
                          ) : post.status === "DRAFT" ? (
                            <>
                              <Tooltip label="Publish draft">
                                <Button className="h-9 min-h-9 px-3" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ postId: post.id, status: "OPEN" })} type="button" variant="secondary">
                                  Publish
                                </Button>
                              </Tooltip>
                              <Tooltip label="Archive draft">
                                <Button className="h-9 min-h-9 px-3" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ postId: post.id, status: "ARCHIVED" })} type="button" variant="secondary">
                                  Archive
                                </Button>
                              </Tooltip>
                            </>
                          ) : post.status === "ARCHIVED" ? (
                            <>
                              <Tooltip label="Resume as draft">
                                <Button className="h-9 min-h-9 px-3" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ postId: post.id, status: "DRAFT" })} type="button" variant="secondary">
                                  Resume
                                </Button>
                              </Tooltip>
                              <Tooltip label="Publish archived post">
                                <Button className="h-9 min-h-9 px-3" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ postId: post.id, status: "OPEN" })} type="button" variant="secondary">
                                  Publish
                                </Button>
                              </Tooltip>
                            </>
                          ) : post.status === "OPEN" ? (
                            <>
                              <Tooltip label="Boost post">
                                <Button className="h-9 min-h-9 px-3" disabled={boostMutation.isPending} onClick={() => boostMutation.mutate(post.id)} type="button" variant="secondary">
                                  <Rocket className="size-4" />
                                  Boost
                                </Button>
                              </Tooltip>
                              <Tooltip label="Archive post">
                                <Button className="h-9 min-h-9 px-3" disabled={statusMutation.isPending} onClick={() => statusMutation.mutate({ postId: post.id, status: "ARCHIVED" })} type="button" variant="secondary">
                                  Archive
                                </Button>
                              </Tooltip>
                            </>
                          ) : null}
                          {!isDeletedView ? (
                            <Tooltip label="Delete post">
                              <Button className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(post.id)} type="button" variant="danger">
                                <Trash2 className="size-4" />
                                Delete
                              </Button>
                            </Tooltip>
                          ) : null}
                        </div>
                      ) : (
                        <Link className="text-sm font-semibold text-primary" onClick={(event) => event.stopPropagation()} to={`/posts/${post.id}`}>Open</Link>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </>
      )}
    </div>
  );
}

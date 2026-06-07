import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, GitBranchPlus, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { listSupportedCountries } from "@/shared/api/modules/geo";
import { createLocation, createRoute, listRoutes } from "@/shared/api/modules/locationsRoutes";
import { changePostStatus, createPost, deletePost, listPosts, restorePost, type PostStatus } from "@/shared/api/modules/posts";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { inlineRouteSchema, type InlineRouteFormInput, type InlineRouteFormValues } from "@/features/locations-routes/routeSchemas";
import { canManageCompanyPosts } from "./postPermissions";
import { postSchema, type PostFormInput, type PostFormValues } from "./postSchemas";

type PostsPageProps = {
  mode?: "planned" | "quick";
};

const currencyOptions = ["EUR", "MKD", "BGN", "RSD", "ALL", "TRY", "RON", "BAM"];
const postStatuses: Array<PostStatus | "ALL"> = ["ALL", "OPEN", "ASSIGNED", "CANCELLED", "EXPIRED"];

function formatRoute(routeId: string, routes: Awaited<ReturnType<typeof listRoutes>>) {
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

export function PostsPage({ mode = "planned" }: PostsPageProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const isAdmin = canManageCompanyPosts(user?.role);
  const requestedStatus = searchParams.get("status");
  const status = postStatuses.includes(requestedStatus as PostStatus) && requestedStatus !== "ALL" ? requestedStatus as PostStatus : null;
  const selectedStatus = status ?? "ALL";
  const selectedRouteId = searchParams.get("routeId") ?? "";
  const search = searchParams.get("q") ?? "";
  const postsQuery = useQuery({ queryFn: () => listPosts(status ? { status } : undefined), queryKey: ["posts", status ?? "ALL"] });
  const routesQuery = useQuery({ queryFn: () => listRoutes(), queryKey: ["routes"] });
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"], staleTime: 1000 * 60 * 30 });
  const routes = routesQuery.data ?? [];
  const posts = postsQuery.data ?? [];
  const countries = countriesQuery.data ?? [];
  const filteredPosts = posts.filter((post) => {
    const searchNeedle = search.trim().toLowerCase();
    const matchesRoute = !selectedRouteId || post.routeId === selectedRouteId;
    const matchesSearch = !searchNeedle || `${post.title ?? ""} ${post.cargoDescription ?? ""} ${post.description ?? ""}`.toLowerCase().includes(searchNeedle);
    return matchesRoute && matchesSearch;
  });

  const updateFilter = (key: "q" | "routeId" | "status", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
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

  const inlineRouteForm = useForm<InlineRouteFormInput, unknown, InlineRouteFormValues>({
    resolver: zodResolver(inlineRouteSchema),
    defaultValues: {
      destinationCity: "",
      destinationCountryCode: "",
      distanceKm: "",
      estimatedDurationMinutes: "",
      originCity: "",
      originCountryCode: "",
    },
  });

  const createMutation = useAppMutation({
    messages: { success: "Transport post created" },
    mutationFn: createPost,
    onSuccess: () => {
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const statusMutation = useAppMutation({
    messages: { success: "Post status updated" },
    mutationFn: ({ postId, status }: { postId: string; status: "CANCELLED" | "OPEN" }) => changePostStatus(postId, status),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["posts"] }),
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

  const inlineRouteMutation = useAppMutation({
    messages: { success: "Route created" },
    mutationFn: async (values: InlineRouteFormValues) => {
      const origin = await createLocation({ city: values.originCity, countryCode: values.originCountryCode });
      const destination = await createLocation({ city: values.destinationCity, countryCode: values.destinationCountryCode });
      return createRoute({
        destinationLocationId: destination.id,
        distanceKm: values.distanceKm,
        estimatedDurationMinutes: values.estimatedDurationMinutes,
        originLocationId: origin.id,
      });
    },
    onSuccess: (route) => {
      inlineRouteForm.reset();
      form.setValue("routeId", route.id, { shouldDirty: true, shouldValidate: true });
      void queryClient.invalidateQueries({ queryKey: ["routes"] });
    },
  });

  if (postsQuery.isLoading || routesQuery.isLoading) {
    return <LoadingState description="Preparing posts, routes, and company marketplace data." title="Loading transport posts" />;
  }

  if (postsQuery.error || routesQuery.error) {
    return (
      <ErrorState
        description="The frontend could not load the current marketplace workspace data."
        error={postsQuery.error ?? routesQuery.error}
        title="Unable to load posts"
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={isAdmin ? <Button disabled={routes.length === 0} form="create-post-form" type="submit"><Plus className="size-4" /> Create post</Button> : null}
        eyebrow="Company marketplace"
        subtitle={mode === "quick" ? "Create a route and post in one quick workflow." : "Reuse planned company routes for repeatable transport posts."}
        title={mode === "quick" ? "Quick route post" : "Planned transport posts"}
      />

      {isAdmin ? (
        <div className={mode === "quick" ? "grid gap-5 xl:grid-cols-[0.48fr_0.52fr]" : "grid gap-5"}>
          {mode === "planned" ? <Surface>
            <form className="grid gap-4 lg:grid-cols-3" id="create-post-form" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
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
              <Field error={form.formState.errors.title} label="Title">
                <Input {...form.register("title")} placeholder="Skopje to Sofia load" />
              </Field>
              <Field error={form.formState.errors.priceType} label="Price type" required>
                <Select {...form.register("priceType")}>
                  <option value="REQUEST_QUOTE">{humanizeEnum("REQUEST_QUOTE")}</option>
                  <option value="FIXED">{humanizeEnum("FIXED")}</option>
                  <option value="NEGOTIABLE">{humanizeEnum("NEGOTIABLE")}</option>
                </Select>
              </Field>
              <div className="lg:col-span-2">
                <Field error={form.formState.errors.priceAmount ?? form.formState.errors.currency} label="Price">
                  <div className="grid grid-cols-[1fr_7rem] rounded-lg border border-border bg-card shadow-sm focus-within:border-slate-300">
                    <input className="h-10 min-w-0 rounded-l-lg bg-transparent px-3 text-sm outline-none" {...form.register("priceAmount")} inputMode="decimal" placeholder="Amount" />
                    <Select className="rounded-l-none border-0 shadow-none" {...form.register("currency")}>
                      {currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                    </Select>
                  </div>
                </Field>
              </div>
              <Field error={form.formState.errors.weightKg} label="Weight kg">
                <Input {...form.register("weightKg")} inputMode="numeric" type="number" />
              </Field>
              <div className="lg:col-span-3">
                <Field error={form.formState.errors.cargoDescription} label="Cargo description">
                  <Textarea {...form.register("cargoDescription")} placeholder="Describe cargo, constraints, and timing context." />
                </Field>
              </div>
              <div className="lg:col-span-3">
                <Button disabled={createMutation.isPending || routes.length === 0} type="submit">
                  <Plus className="size-4" />
                  Create post
                </Button>
              </div>
            </form>
          </Surface> : null}

          {mode === "quick" ? <Surface>
            <form className="space-y-4" onSubmit={inlineRouteForm.handleSubmit((values) => inlineRouteMutation.mutate(values))}>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">Quick route</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Create the minimum origin, destination, and route needed for a post.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
                <Field error={inlineRouteForm.formState.errors.originCity} label="Origin city" required>
                  <Input {...inlineRouteForm.register("originCity")} placeholder="Skopje" />
                </Field>
                <Field error={inlineRouteForm.formState.errors.originCountryCode} label="Origin country" required>
                  <Select {...inlineRouteForm.register("originCountryCode")}>
                    <option value="">Select country</option>
                    {countries.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
                  </Select>
                </Field>
                <Field error={inlineRouteForm.formState.errors.destinationCity} label="Destination city" required>
                  <Input {...inlineRouteForm.register("destinationCity")} placeholder="Sofia" />
                </Field>
                <Field error={inlineRouteForm.formState.errors.destinationCountryCode} label="Destination country" required>
                  <Select {...inlineRouteForm.register("destinationCountryCode")}>
                    <option value="">Select country</option>
                    {countries.map((country) => <option key={country.code} value={country.code}>{country.name} ({country.code})</option>)}
                  </Select>
                </Field>
                <Field error={inlineRouteForm.formState.errors.distanceKm} label="Distance km">
                  <Input {...inlineRouteForm.register("distanceKm")} inputMode="numeric" type="number" />
                </Field>
                <Field error={inlineRouteForm.formState.errors.estimatedDurationMinutes} label="Duration minutes">
                  <Input {...inlineRouteForm.register("estimatedDurationMinutes")} inputMode="numeric" type="number" />
                </Field>
              </div>
              <Button disabled={inlineRouteMutation.isPending} type="submit" variant="secondary">
                <GitBranchPlus className="size-4" />
                Create and select route
              </Button>
            </form>
          </Surface> : null}
          {mode === "quick" ? (
            <Surface>
              <form className="grid gap-4 lg:grid-cols-2" id="create-post-form" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
                <Field error={form.formState.errors.routeId} label="Route" required>
                  <Select {...form.register("routeId")}><option value="">Create/select route first</option>{routes.map((route) => <option key={route.id} value={route.id}>{route.originLocation.city} {"->"} {route.destinationLocation.city}</option>)}</Select>
                </Field>
                <Field error={form.formState.errors.title} label="Title"><Input {...form.register("title")} placeholder="Skopje to Sofia load" /></Field>
                <Field error={form.formState.errors.priceType} label="Price type" required>
                  <Select {...form.register("priceType")}><option value="REQUEST_QUOTE">{humanizeEnum("REQUEST_QUOTE")}</option><option value="FIXED">{humanizeEnum("FIXED")}</option><option value="NEGOTIABLE">{humanizeEnum("NEGOTIABLE")}</option></Select>
                </Field>
                <Field error={form.formState.errors.priceAmount ?? form.formState.errors.currency} label="Price">
                  <div className="grid grid-cols-[1fr_7rem] rounded-lg border border-border bg-card shadow-sm focus-within:border-slate-300">
                    <input className="h-10 min-w-0 rounded-l-lg bg-transparent px-3 text-sm outline-none" {...form.register("priceAmount")} inputMode="decimal" placeholder="Amount" />
                    <Select className="rounded-l-none border-0 shadow-none" {...form.register("currency")}>{currencyOptions.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</Select>
                  </div>
                </Field>
                <div className="lg:col-span-2"><Field error={form.formState.errors.cargoDescription} label="Cargo description"><Textarea {...form.register("cargoDescription")} placeholder="Describe cargo, constraints, and timing context." /></Field></div>
                <div className="lg:col-span-2"><Button disabled={createMutation.isPending || routes.length === 0} type="submit"><Plus className="size-4" /> Create post</Button></div>
              </form>
            </Surface>
          ) : null}
        </div>
      ) : null}

      <Surface>
        <div className="grid gap-4 lg:grid-cols-[0.7fr_0.45fr_0.45fr_auto] lg:items-end">
          <Field label="Search posts">
            <Input onChange={(event) => updateFilter("q", event.target.value)} placeholder="Cargo, title, description" value={search} />
          </Field>
          <Field label="Status">
            <Select onChange={(event) => updateFilter("status", event.target.value)} value={selectedStatus}>
              {postStatuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : humanizeEnum(item)}</option>)}
            </Select>
          </Field>
          <Field label="Route">
            <Select onChange={(event) => updateFilter("routeId", event.target.value)} value={selectedRouteId}>
              <option value="">All routes</option>
              {routes.map((route) => <option key={route.id} value={route.id}>{route.originLocation.city} {"->"} {route.destinationLocation.city}</option>)}
            </Select>
          </Field>
          <Button onClick={() => setSearchParams(new URLSearchParams())} type="button" variant="secondary">
            <Filter className="size-4" aria-hidden="true" />
            Clear
          </Button>
        </div>
      </Surface>

      {routes.length === 0 ? (
        <EmptyState
          action={isAdmin ? <Link className="inline-flex min-h-10 items-center rounded-lg border border-primary bg-card px-4 py-2 text-sm text-primary" to="/routes">Create routes first</Link> : null}
          description={isAdmin ? "A backend route is required before a transport post can be created." : "Your company has not created routes yet. Ask an admin to configure operational routes."}
          title="Routes are required"
        />
      ) : filteredPosts.length === 0 ? (
        <EmptyState
          description={posts.length === 0 ? "Create the first transport post to start receiving and managing bids." : "No posts match the current status, route, or search filters."}
          title={posts.length === 0 ? "No posts yet" : "No matching posts"}
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
              <tr key={post.id}>
                <Td>
                  <Link className="font-semibold text-primary" to={`/posts/${post.id}`}>
                    {post.title || post.cargoDescription || "Untitled post"}
                  </Link>
                </Td>
                <Td>{formatRoute(post.routeId, routes)}</Td>
                <Td><StatusBadge tone={postTone(post.status)}>{humanizeEnum(post.status)}</StatusBadge></Td>
                <Td>{post.priceAmount ? `${post.priceAmount} ${post.currency}` : humanizeEnum(post.priceType)}</Td>
                <Td>
                  {isAdmin ? (
                    <div className="flex flex-wrap gap-2">
                      {post.status === "OPEN" ? (
                        <Button className="h-9 min-h-9 px-4" onClick={() => statusMutation.mutate({ postId: post.id, status: "CANCELLED" })} type="button" variant="secondary">
                          Cancel
                        </Button>
                      ) : null}
                      <Button className="h-9 min-h-9 px-4" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(post.id)} type="button" variant="danger">
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted">View only</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

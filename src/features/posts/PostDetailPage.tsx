import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Clock, MapPin, Package, Pencil, Rocket, Send, ShieldCheck, Truck } from "lucide-react";
import { Fragment, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { boostBid, changeBidStatus, createBid, deleteBid, listBids, restoreBid, updateBid, type BidRecord, type BidStatus } from "@/shared/api/modules/bids";
import { listContracts } from "@/shared/api/modules/contracts";
import { listRoutes } from "@/shared/api/modules/locationsRoutes";
import { boostPost, changePostStatus, deletePost, getPost, restorePost, updatePost } from "@/shared/api/modules/posts";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { bidSchema, type BidFormInput, type BidFormValues } from "@/features/bids/bidSchemas";
import { contractTone, formatCurrency } from "@/features/contracts/contractFormatters";
import { canDecideBid, canEditCompanyPost, canManageCompanyPosts, canManageOwnPendingBid } from "./postPermissions";
import { postSchema, type PostFormInput, type PostFormValues } from "./postSchemas";

function bidTone(status: string) {
  if (status === "ACCEPTED") return "success";
  if (status === "REJECTED" || status === "WITHDRAWN") return "danger";
  return "neutral";
}

function postTone(status: string) {
  if (status === "DRAFT" || status === "ARCHIVED") return "neutral";
  if (status === "OPEN") return "success";
  if (status === "ASSIGNED") return "warning";
  if (status === "CANCELLED" || status === "EXPIRED") return "danger";
  return "neutral";
}

function toDateTimeInput(value?: string | null) {
  return value ? value.slice(0, 16) : "";
}

function formatDuration(minutes?: number | null) {
  if (!minutes) return "Not estimated";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  return mins ? `${hours} hr ${mins} min` : `${hours} hr`;
}

function formatRouteLocation(location?: { city: string; countryCode: string; region?: string | null }) {
  if (!location) return "Not available";
  return [location.city, location.region, location.countryCode].filter(Boolean).join(", ");
}

function bidFormValues(bid: BidRecord): BidFormInput {
  return {
    currency: bid.currency,
    estimatedDeliveryAt: toDateTimeInput(bid.estimatedDeliveryAt),
    estimatedPickupAt: toDateTimeInput(bid.estimatedPickupAt),
    message: bid.message ?? "",
    offeredPriceAmount: bid.offeredPriceAmount ?? "",
    postId: bid.postId,
  };
}

function isPostBoosted(post?: { promotedUntil?: string | null } | null) {
  return Boolean(post?.promotedUntil && new Date(post.promotedUntil) > new Date());
}

function isBidBoosted(bid: BidRecord) {
  return Boolean(bid.boostedUntil && new Date(bid.boostedUntil) > new Date());
}

export function PostDetailPage() {
  const { postId = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = canManageCompanyPosts(user?.role);
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [pendingBidAction, setPendingBidAction] = useState<{
    bidId: string;
    status: Extract<BidStatus, "ACCEPTED" | "REJECTED" | "WITHDRAWN">;
  } | null>(null);
  const [boostBidTarget, setBoostBidTarget] = useState<BidRecord | null>(null);
  const [boostCredits, setBoostCredits] = useState("1");
  const postQuery = useQuery({ enabled: Boolean(postId), queryFn: () => getPost(postId), queryKey: ["posts", postId] });
  const bidsQuery = useQuery({ enabled: Boolean(postId), queryFn: () => listBids({ postId }), queryKey: ["bids", postId] });
  const contractsQuery = useQuery({ enabled: Boolean(postId), queryFn: () => listContracts(), queryKey: ["contracts", "post-handoff", postId] });
  const post = postQuery.data;
  const ownsPost = Boolean(post && user?.companyId === post.companyId);
  const routesQuery = useQuery({ enabled: ownsPost, queryFn: () => listRoutes(), queryKey: ["routes"] });
  const bids = bidsQuery.data ?? [];
  const routes = routesQuery.data ?? [];
  const route = post?.route ?? routes.find((item) => item.id === post?.routeId);
  const relatedContracts = (contractsQuery.data ?? []).filter((contract) => contract.postId === postId);
  const activeContract = relatedContracts[0];
  const acceptedBids = bids.filter((bid) => bid.status === "ACCEPTED" && bid.offeredPriceAmount);
  const pendingBids = bids.filter((bid) => bid.status === "PENDING");
  const canCreateBid = Boolean(post && isAdmin && user?.companyId && user.companyId !== post.companyId && post.status === "OPEN");
  const canEditPost = Boolean(post && canEditCompanyPost({ ownsPost, role: user?.role, status: post.status }));
  const isEditRoute = location.pathname.endsWith("/edit");

  const form = useForm<BidFormInput, unknown, BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      currency: post?.currency ?? "EUR",
      estimatedDeliveryAt: "",
      estimatedPickupAt: "",
      message: "",
      offeredPriceAmount: "",
      postId,
    },
    values: {
      currency: post?.currency ?? "EUR",
      estimatedDeliveryAt: "",
      estimatedPickupAt: "",
      message: "",
      offeredPriceAmount: "",
      postId,
    },
  });

  const postForm = useForm<PostFormInput, unknown, PostFormValues>({
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
    values: {
      cargoDescription: post?.cargoDescription ?? "",
      cargoType: post?.cargoType ?? "",
      currency: post?.currency ?? "EUR",
      description: post?.description ?? "",
      priceAmount: post?.priceAmount ?? "",
      priceType: post?.priceType ?? "REQUEST_QUOTE",
      routeId: post?.routeId ?? "",
      title: post?.title ?? "",
      weightKg: post?.weightKg ? String(post.weightKg) : "",
    },
  });

  const bidEditForm = useForm<BidFormInput, unknown, BidFormValues>({
    resolver: zodResolver(bidSchema),
    defaultValues: {
      currency: "EUR",
      estimatedDeliveryAt: "",
      estimatedPickupAt: "",
      message: "",
      offeredPriceAmount: "",
      postId,
    },
  });

  const createBidMutation = useAppMutation({
    messages: { success: "Bid submitted" },
    mutationFn: createBid,
    onSuccess: () => {
      form.reset();
      void queryClient.invalidateQueries({ queryKey: ["bids", postId] });
    },
  });

  const statusMutation = useAppMutation({
    messages: {
      success: (bid) => bid.status === "ACCEPTED" && bid.contract ? "Contract created" : "Bid status updated",
    },
    mutationFn: ({ bidId, status }: { bidId: string; status: "ACCEPTED" | "REJECTED" | "WITHDRAWN" }) => changeBidStatus(bidId, status),
    onSuccess: () => {
      setPendingBidAction(null);
      void queryClient.invalidateQueries({ queryKey: ["bids", postId] });
      void queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      void queryClient.invalidateQueries({ queryKey: ["contracts"] });
      void queryClient.invalidateQueries({ queryKey: ["contracts", "post-handoff", postId] });
    },
  });

  const boostPostMutation = useAppMutation({
    messages: { success: "Post boosted" },
    mutationFn: () => boostPost(postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const boostBidMutation = useAppMutation({
    messages: { success: "Bid boosted" },
    mutationFn: () => boostBid(boostBidTarget?.id ?? "", Number(boostCredits)),
    onSuccess: () => {
      setBoostBidTarget(null);
      setBoostCredits("1");
      void queryClient.invalidateQueries({ queryKey: ["bids", postId] });
    },
  });

  const postStatusMutation = useAppMutation({
    messages: { success: "Post status updated" },
    mutationFn: ({ status }: { status: "ARCHIVED" | "DRAFT" | "OPEN" }) => changePostStatus(postId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const updatePostMutation = useAppMutation({
    messages: { success: "Post updated" },
    mutationFn: (values: PostFormValues) => updatePost(postId, values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts", postId] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const restorePostMutation = useAppMutation({
    messages: { success: "Post restored" },
    mutationFn: restorePost,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const deletePostMutation = useAppMutation({
    mutationFn: () => deletePost(postId),
    onSuccess: (deletedPost) => {
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      navigate("/posts", { replace: true });
      toast.success("Post deleted", {
        action: {
          label: "Undo",
          onClick: () => restorePostMutation.mutate(deletedPost.id),
        },
      });
    },
  });

  const updateBidMutation = useAppMutation({
    messages: { success: "Bid updated" },
    mutationFn: ({ bidId, values }: { bidId: string; values: BidFormValues }) =>
      updateBid(bidId, {
        currency: values.currency,
        estimatedDeliveryAt: values.estimatedDeliveryAt,
        estimatedPickupAt: values.estimatedPickupAt,
        message: values.message,
        offeredPriceAmount: values.offeredPriceAmount,
      }),
    onSuccess: () => {
      setEditingBidId(null);
      bidEditForm.reset();
      void queryClient.invalidateQueries({ queryKey: ["bids", postId] });
    },
  });

  const restoreBidMutation = useAppMutation({
    messages: { success: "Bid restored" },
    mutationFn: restoreBid,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bids", postId] });
    },
  });

  const deleteBidMutation = useAppMutation({
    mutationFn: deleteBid,
    onSuccess: (bid) => {
      void queryClient.invalidateQueries({ queryKey: ["bids", postId] });
      toast.success("Bid deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreBidMutation.mutate(bid.id),
        },
      });
    },
  });

  if (postQuery.isLoading || (routesQuery.isLoading && ownsPost)) {
    return <LoadingState description="Loading post, routes, and related bid data." title="Loading post detail" />;
  }

  if (postQuery.error || (routesQuery.error && ownsPost)) {
    return (
      <ErrorState
        action={<Link className="inline-flex min-h-10 items-center rounded-lg border border-primary bg-card px-4 py-2 text-sm text-primary" to="/posts">Back to posts</Link>}
        description="The post detail workspace could not be loaded."
        error={postQuery.error ?? routesQuery.error}
        title="Unable to load post"
      />
    );
  }

  if (!post) {
    return <EmptyState description="The post could not be loaded or is no longer available." title="Post not found" />;
  }

  const editPostForm = (
    <Surface>
      <form className="grid gap-4 lg:grid-cols-3" onSubmit={postForm.handleSubmit((values) => updatePostMutation.mutate(values))}>
        <div className="lg:col-span-3">
          <h2 className="text-2xl font-semibold tracking-[-0.28px]">Edit post</h2>
          <p className="mt-1 text-sm leading-6 text-muted">Draft, open, and archived posts can be adjusted before assignment.</p>
        </div>
        <Field error={postForm.formState.errors.routeId} label="Route" required>
          <Select {...postForm.register("routeId")}>
            <option value="">Select route</option>
            {routes.map((route) => (
              <option key={route.id} value={route.id}>
                {route.originLocation.city} {"->"} {route.destinationLocation.city}
              </option>
            ))}
          </Select>
        </Field>
        <Field error={postForm.formState.errors.title} label="Title">
          <Input {...postForm.register("title")} />
        </Field>
        <Field error={postForm.formState.errors.priceType} label="Price type" required>
          <Select {...postForm.register("priceType")}>
            <option value="REQUEST_QUOTE">Request quote</option>
            <option value="FIXED">Fixed</option>
            <option value="NEGOTIABLE">Negotiable</option>
          </Select>
        </Field>
        <Field error={postForm.formState.errors.currency} label="Currency" required>
          <Input {...postForm.register("currency")} />
        </Field>
        <Field error={postForm.formState.errors.priceAmount} label="Price amount">
          <Input {...postForm.register("priceAmount")} inputMode="decimal" />
        </Field>
        <Field error={postForm.formState.errors.weightKg} label="Weight kg">
          <Input {...postForm.register("weightKg")} inputMode="numeric" type="number" />
        </Field>
        <div className="lg:col-span-3">
          <Field error={postForm.formState.errors.cargoDescription} label="Cargo description">
            <Textarea {...postForm.register("cargoDescription")} />
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 lg:col-span-3">
          <Button disabled={updatePostMutation.isPending} type="submit">
            <Pencil className="size-4" />
            Save changes
          </Button>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-lg bg-transparent px-4 py-2 text-sm font-normal text-primary transition hover:bg-surface-pearl" to={`/posts/${post.id}`}>
            Back to detail
          </Link>
        </div>
      </form>
    </Surface>
  );

  if (isEditRoute) {
    return (
      <div className="space-y-6">
        <Link className="inline-flex items-center gap-2 text-sm text-primary" to={`/posts/${post.id}`}>
          <ArrowLeft className="size-4" />
          Back to post
        </Link>
        <PageHeader
          eyebrow="Transport post"
          subtitle="Edit the post in a focused workspace instead of beneath the bid table."
          title={`Edit ${post.title ?? "post"}`}
        />
        {canEditPost ? editPostForm : (
          <EmptyState
            action={<Link className="inline-flex min-h-10 items-center rounded-lg border border-primary bg-card px-4 py-2 text-sm text-primary" to={`/posts/${post.id}`}>Open detail</Link>}
            description="Only company admins can edit draft, open, or archived posts owned by their company."
            title="Post is not editable"
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-primary" to="/posts">
        <ArrowLeft className="size-4" />
        Back to posts
      </Link>
      <PageHeader
        action={
          isAdmin && ownsPost ? (
            <div className="flex flex-wrap gap-2">
              {canEditPost ? (
                <Link
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-card px-4 py-2 text-sm font-normal text-primary transition hover:bg-surface-pearl"
                  to={`/posts/${post.id}/edit`}
                >
                  <Pencil className="size-4" />
                  Edit post
                </Link>
              ) : null}
              {post.status === "DRAFT" ? (
                <>
                  <Button disabled={postStatusMutation.isPending} onClick={() => postStatusMutation.mutate({ status: "OPEN" })} type="button" variant="secondary">
                    Publish
                  </Button>
                  <Button disabled={postStatusMutation.isPending} onClick={() => postStatusMutation.mutate({ status: "ARCHIVED" })} type="button" variant="secondary">
                    Archive
                  </Button>
                </>
              ) : post.status === "ARCHIVED" ? (
                <>
                  <Button disabled={postStatusMutation.isPending} onClick={() => postStatusMutation.mutate({ status: "DRAFT" })} type="button" variant="secondary">
                    Resume draft
                  </Button>
                  <Button disabled={postStatusMutation.isPending} onClick={() => postStatusMutation.mutate({ status: "OPEN" })} type="button" variant="secondary">
                    Publish
                  </Button>
                </>
              ) : post.status === "OPEN" ? (
                <>
                  <Button disabled={boostPostMutation.isPending} onClick={() => boostPostMutation.mutate()} type="button" variant="secondary">
                    <Rocket className="size-4" />
                    Boost post - 2 credits
                  </Button>
                  <Button disabled={postStatusMutation.isPending} onClick={() => postStatusMutation.mutate({ status: "ARCHIVED" })} type="button" variant="secondary">
                    Archive post
                  </Button>
                </>
              ) : null}
              <Button disabled={deletePostMutation.isPending} onClick={() => deletePostMutation.mutate()} type="button" variant="danger">
                Delete post
              </Button>
            </div>
          ) : null
        }
        eyebrow="Transport post"
        subtitle={post.cargoDescription ?? post.description ?? "Review marketplace demand and manage related bids."}
        title={post.title ?? "Untitled post"}
      />

      {isPostBoosted(post) ? (
        <Surface className="border-blue-100 bg-blue-50">
          <div className="flex items-start gap-3">
            <Rocket className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Boosted post</p>
              <p className="mt-1 text-sm leading-6 text-muted">Boosted posts rank higher in the marketplace for 7 days.</p>
            </div>
          </div>
        </Surface>
      ) : null}

      {!ownsPost ? (
        <Surface className="border-blue-100 bg-blue-50">
          <div className="flex items-start gap-3">
            <Truck className="mt-0.5 size-5 text-primary" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-foreground">Marketplace opportunity</p>
              <p className="mt-1 text-sm leading-6 text-muted">
                This is an open post from another company. You can review the safe route and cargo details, then submit a bid if your company can cover it.
              </p>
            </div>
          </div>
        </Surface>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
        <Surface className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
            <div className="rounded-lg border border-border bg-surface-pearl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
                <MapPin className="size-4" aria-hidden="true" />
                Origin
              </div>
              <p className="mt-2 text-lg font-semibold">{formatRouteLocation(route?.originLocation)}</p>
            </div>
            <div className="hidden h-px bg-border md:block" />
            <div className="rounded-lg border border-border bg-surface-pearl p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted">
                <MapPin className="size-4" aria-hidden="true" />
                Destination
              </div>
              <p className="mt-2 text-lg font-semibold">{formatRouteLocation(route?.destinationLocation)}</p>
            </div>
          </div>
          <dl className="grid gap-4 md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Status</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                <StatusBadge tone={postTone(post.status)}>{humanizeEnum(post.status)}</StatusBadge>
                {isPostBoosted(post) ? <StatusBadge tone="success">Boosted</StatusBadge> : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Price</dt>
              <dd className="mt-1 text-sm">{post.priceAmount ? formatCurrency(post.priceAmount, post.currency) : humanizeEnum(post.priceType)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Distance</dt>
              <dd className="mt-1 text-sm">{route?.distanceKm ? `${route.distanceKm} km` : "Not estimated"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Duration</dt>
              <dd className="mt-1 flex items-center gap-1 text-sm"><Clock className="size-4 text-muted" aria-hidden="true" /> {formatDuration(route?.estimatedDurationMinutes)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Cargo type</dt>
              <dd className="mt-1 flex items-center gap-1 text-sm"><Package className="size-4 text-muted" aria-hidden="true" /> {post.cargoType ?? "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Weight</dt>
              <dd className="mt-1 text-sm">{post.weightKg ? `${post.weightKg} kg` : "Not specified"}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Bid state</dt>
              <dd className="mt-1 text-sm">{bids.length} total / {pendingBids.length} pending / {acceptedBids.length} accepted</dd>
              <p className="mt-1 text-xs text-muted">
                {activeContract ? "Contract created from the accepted bid." : acceptedBids.length ? "Accepted bid is ready for contract handoff." : "Accept a pending bid to create the contract automatically."}
              </p>
              <Link className="mt-1 inline-flex text-xs font-semibold text-primary" to={`/bids?postId=${post.id}`}>
                Manage bids
              </Link>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Posted by</dt>
              <dd className="mt-1 flex items-center gap-1 text-sm">
                <Building2 className="size-4 text-muted" aria-hidden="true" />
                {post.company?.name ?? "Company"}
                {post.company?.isVerified ? <ShieldCheck className="size-4 text-emerald-600" aria-label="Verified company" /> : null}
              </dd>
            </div>
          </dl>
        </Surface>

        <Surface>
          {activeContract ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.28px]">Contract handoff</h2>
                  <p className="mt-1 text-sm leading-6 text-muted">An accepted bid has moved this post into contract execution.</p>
                </div>
                <StatusBadge tone={contractTone(activeContract.status)}>{humanizeEnum(activeContract.status)}</StatusBadge>
              </div>
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Contract</dt>
                  <dd className="mt-1">{activeContract.id.slice(0, 8)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Source</dt>
                  <dd className="mt-1">Created automatically from accepted bid {activeContract.acceptedBidId.slice(0, 8)}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase text-muted">Agreed price</dt>
                  <dd className="mt-1">{formatCurrency(activeContract.agreedPriceAmount, activeContract.currency)}</dd>
                </div>
              </dl>
              <Link
                className="inline-flex min-h-10 items-center justify-center rounded-lg border border-primary bg-card px-4 py-2 text-sm text-primary hover:bg-surface-pearl"
                to={`/contracts/${activeContract.id}`}
              >
                Open contract
              </Link>
            </div>
          ) : canCreateBid ? (
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => createBidMutation.mutate(values))}>
              <h2 className="text-2xl font-semibold tracking-[-0.28px]">Submit bid</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1">
                <Field error={form.formState.errors.offeredPriceAmount} label="Offered price">
                  <Input {...form.register("offeredPriceAmount")} inputMode="decimal" />
                </Field>
                <Field error={form.formState.errors.currency} label="Currency" required>
                  <Input {...form.register("currency")} />
                </Field>
              </div>
              <Field error={form.formState.errors.message} label="Message">
                <Textarea {...form.register("message")} />
              </Field>
              <Button disabled={createBidMutation.isPending} type="submit">
                <Send className="size-4" />
                Send bid
              </Button>
            </form>
          ) : (
            <EmptyState
              description={ownsPost ? "Review incoming bids and accept the right one. The contract will be created automatically." : "Bidding is available only for open posts owned by another company."}
              title={ownsPost ? "Next action: manage bids" : "Bidding unavailable"}
            />
          )}
        </Surface>
      </div>

      {boostBidTarget ? (
        <Surface>
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
            <div>
              <h2 className="text-xl font-semibold">Boost bid ranking</h2>
              <p className="mt-1 text-sm text-muted">Higher boost spend ranks this bid higher for the shipper. The owner sees only a boosted label.</p>
            </div>
            <Field label="Credits">
              <Input min={1} onChange={(event) => setBoostCredits(event.target.value)} type="number" value={boostCredits} />
            </Field>
            <div className="flex flex-wrap gap-2">
              <Button disabled={boostBidMutation.isPending || Number(boostCredits) < 1} onClick={() => boostBidMutation.mutate()} type="button">
                Boost bid
              </Button>
              <Button onClick={() => setBoostBidTarget(null)} type="button" variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {bidsQuery.isLoading ? (
        <LoadingState description="Loading bids connected to this transport post." title="Loading bids" />
      ) : bidsQuery.error ? (
        <ErrorState description="The related bids could not be loaded." error={bidsQuery.error} title="Unable to load bids" />
      ) : bids.length === 0 ? (
        <EmptyState description="Bids submitted for this post will appear here." title="No bids yet" />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Message</Th>
              <Th>Offer</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => {
              const ownsBid = user?.companyId === bid.carrierCompanyId;
              const canDecideCurrentBid = canDecideBid({ ownsPost, role: user?.role, status: bid.status });
              const canManageOwnBid = canManageOwnPendingBid({ ownsBid, status: bid.status });

              return (
                <Fragment key={bid.id}>
                  <tr>
                    <Td>{bid.message ?? "No message"}</Td>
                    <Td>{bid.offeredPriceAmount ? formatCurrency(bid.offeredPriceAmount, bid.currency) : bid.currency}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge tone={bidTone(bid.status)}>{humanizeEnum(bid.status)}</StatusBadge>
                        {isBidBoosted(bid) ? <StatusBadge tone="success">Boosted bid</StatusBadge> : null}
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        {canDecideCurrentBid ? (
                          <>
                            <Button className="h-9 min-h-9 px-4" onClick={() => setPendingBidAction({ bidId: bid.id, status: "ACCEPTED" })} type="button">
                              Accept
                            </Button>
                            <Button className="h-9 min-h-9 px-4" onClick={() => setPendingBidAction({ bidId: bid.id, status: "REJECTED" })} type="button" variant="secondary">
                              Reject
                            </Button>
                          </>
                        ) : null}
                        {canManageOwnBid ? (
                          <>
                            <Button
                              className="h-9 min-h-9 px-4"
                              onClick={() => {
                                setEditingBidId(bid.id);
                                bidEditForm.reset(bidFormValues(bid));
                              }}
                              type="button"
                              variant="secondary"
                            >
                              Edit
                            </Button>
                            <Button className="h-9 min-h-9 px-4" onClick={() => setPendingBidAction({ bidId: bid.id, status: "WITHDRAWN" })} type="button" variant="secondary">
                              Withdraw
                            </Button>
                            <Button className="h-9 min-h-9 px-4" onClick={() => setBoostBidTarget(bid)} type="button" variant="secondary">
                              <Rocket className="size-4" />
                              Boost
                            </Button>
                            <Button className="h-9 min-h-9 px-4" disabled={deleteBidMutation.isPending} onClick={() => deleteBidMutation.mutate(bid.id)} type="button" variant="danger">
                              Delete
                            </Button>
                          </>
                        ) : null}
                        {!canDecideCurrentBid && !canManageOwnBid ? <span className="text-sm text-muted">No actions</span> : null}
                      </div>
                    </Td>
                  </tr>
                  {editingBidId === bid.id ? (
                    <tr>
                      <td className="border-b border-border px-4 py-4" colSpan={4}>
                        <form
                          className="grid gap-4 rounded-xl bg-surface-pearl p-4 md:grid-cols-2"
                          onSubmit={bidEditForm.handleSubmit((values) => updateBidMutation.mutate({ bidId: bid.id, values }))}
                        >
                          <Field error={bidEditForm.formState.errors.offeredPriceAmount} label="Offered price">
                            <Input {...bidEditForm.register("offeredPriceAmount")} inputMode="decimal" />
                          </Field>
                          <Field error={bidEditForm.formState.errors.currency} label="Currency" required>
                            <Input {...bidEditForm.register("currency")} />
                          </Field>
                          <Field error={bidEditForm.formState.errors.estimatedPickupAt} label="Pickup estimate">
                            <Input {...bidEditForm.register("estimatedPickupAt")} type="datetime-local" />
                          </Field>
                          <Field error={bidEditForm.formState.errors.estimatedDeliveryAt} label="Delivery estimate">
                            <Input {...bidEditForm.register("estimatedDeliveryAt")} type="datetime-local" />
                          </Field>
                          <div className="md:col-span-2">
                            <Field error={bidEditForm.formState.errors.message} label="Message">
                              <Textarea {...bidEditForm.register("message")} />
                            </Field>
                          </div>
                          <div className="flex flex-wrap gap-2 md:col-span-2">
                            <Button disabled={updateBidMutation.isPending} type="submit">Save bid</Button>
                            <Button onClick={() => setEditingBidId(null)} type="button" variant="ghost">Cancel</Button>
                          </div>
                        </form>
                      </td>
                    </tr>
                  ) : null}
                  {pendingBidAction?.bidId === bid.id ? (
                    <tr>
                      <td className="border-b border-border px-4 py-4" colSpan={4}>
                        <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-pearl p-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {pendingBidAction.status === "ACCEPTED" ? "Accept bid and create contract?" : "Confirm bid action"}
                            </p>
                            <p className="mt-1 text-sm text-muted">
                              {pendingBidAction.status === "ACCEPTED"
                                ? `Bid ${bid.id.slice(0, 8)} will become the contract automatically and competing pending bids will close.`
                                : `Confirm ${humanizeEnum(pendingBidAction.status).toLowerCase()} for bid ${bid.id.slice(0, 8)}.`}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(pendingBidAction)} type="button">
                              Confirm
                            </Button>
                            <Button onClick={() => setPendingBidAction(null)} type="button" variant="ghost">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}

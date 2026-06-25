import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, ExternalLink, Filter, MessageSquareText, PanelRightOpen, Pencil, Rocket, RotateCcw, Search, Trash2, Undo2, X } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  changeBidStatus,
  boostBid,
  createBidReply,
  deleteBid,
  listBidActivities,
  listBidReplies,
  listBids,
  restoreBid,
  updateBid,
  type BidActivityRecord,
  type BidRecord,
  type BidScope,
  type BidStatus,
} from "@/shared/api/modules/bids";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { WorkflowReplyThread } from "@/shared/components/ui/WorkflowReplyThread";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { formatCurrency, formatDateTime } from "@/features/contracts/contractFormatters";

const statuses: Array<BidStatus | "ALL"> = ["ALL", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"];
const scopes: Array<{ label: string; value: BidScope }> = [
  { label: "Received", value: "received" },
  { label: "Sent", value: "sent" },
  { label: "All", value: "all" },
];

function bidTone(status: BidStatus): "danger" | "neutral" | "success" | "warning" {
  if (status === "ACCEPTED") return "success";
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "danger";
  return "neutral";
}

function routeLabel(bid: BidRecord) {
  const route = bid.post.route;
  if (!route) return `Route ${bid.post.routeId.slice(0, 8)}`;
  return `${route.originLocation.city}, ${route.originLocation.countryCode} -> ${route.destinationLocation.city}, ${route.destinationLocation.countryCode}`;
}

function routeMeta(bid: BidRecord) {
  const route = bid.post.route;
  const distance = route?.distanceKm ? `${route.distanceKm} km` : "Distance not set";
  const duration = route?.estimatedDurationMinutes ? `${Math.floor(route.estimatedDurationMinutes / 60)} hr ${route.estimatedDurationMinutes % 60} min` : "Duration not set";
  return `${distance} / ${duration}`;
}

function counterpartyLabel(bid: BidRecord, companyId?: string | null) {
  if (companyId === bid.carrierCompanyId) return bid.post.company?.name ?? "Post owner";
  return bid.carrierCompany?.name ?? "Bidding company";
}

function bidMatchesSearch(bid: BidRecord, query: string, companyId?: string | null) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    bid.post.title,
    bid.post.cargoDescription,
    routeLabel(bid),
    counterpartyLabel(bid, companyId),
    bid.message,
  ].some((value) => value?.toLowerCase().includes(needle));
}

function emptyEditValues(bid: BidRecord) {
  return {
    currency: bid.currency,
    estimatedDeliveryAt: bid.estimatedDeliveryAt?.slice(0, 16) ?? "",
    estimatedPickupAt: bid.estimatedPickupAt?.slice(0, 16) ?? "",
    message: bid.message ?? "",
    offeredPriceAmount: bid.offeredPriceAmount ?? "",
  };
}

function activityMessage(activity: BidActivityRecord) {
  return activity.message || humanizeEnum(activity.type);
}

function canUseBidActions(bid: BidRecord, companyId?: string | null, role?: string) {
  const ownsPost = companyId === bid.post.companyId;
  const ownsBid = companyId === bid.carrierCompanyId;
  const canMutate = role === "COMPANY_ADMIN";
  return {
    canBoost: canMutate && ownsBid && bid.status === "PENDING",
    canDecide: canMutate && ownsPost && bid.status === "PENDING",
    canManageOwn: canMutate && ownsBid && bid.status === "PENDING",
    ownsBid,
    ownsPost,
  };
}

function isBidBoosted(bid: BidRecord) {
  return Boolean(bid.boostedUntil && new Date(bid.boostedUntil) > new Date());
}

export function BidsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [editingBidId, setEditingBidId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState(emptyEditValues({ currency: "EUR" } as BidRecord));
  const [pendingAction, setPendingAction] = useState<{ bid: BidRecord; status: Extract<BidStatus, "ACCEPTED" | "REJECTED" | "WITHDRAWN"> } | null>(null);
  const [boostBidTarget, setBoostBidTarget] = useState<BidRecord | null>(null);
  const [boostCredits, setBoostCredits] = useState("1");
  const [selectedBid, setSelectedBid] = useState<BidRecord | null>(null);
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");

  const scope = (searchParams.get("scope") as BidScope | null) ?? "received";
  const safeScope = scopes.some((item) => item.value === scope) ? scope : "received";
  const statusParam = searchParams.get("status");
  const status = statusParam && statusParam !== "ALL" && statuses.includes(statusParam as BidStatus) ? statusParam as BidStatus : undefined;
  const postId = searchParams.get("postId") ?? undefined;

  const bidsQuery = useQuery({
    queryFn: () => listBids({ deleted: registryView === "deleted" ? "only" : "active", postId, scope: safeScope, status }),
    queryKey: ["bids", "workspace", safeScope, status ?? "ALL", postId ?? "all", registryView],
  });
  const activitiesQuery = useQuery({
    enabled: Boolean(selectedBid),
    queryFn: () => listBidActivities(selectedBid?.id ?? ""),
    queryKey: ["bids", selectedBid?.id, "activities"],
  });
  const repliesQuery = useQuery({
    enabled: Boolean(selectedBid),
    queryFn: () => listBidReplies(selectedBid?.id ?? ""),
    queryKey: ["bids", selectedBid?.id, "replies"],
  });
  const bids = useMemo(
    () => (bidsQuery.data ?? []).filter((bid) => bidMatchesSearch(bid, search, user?.companyId)),
    [bidsQuery.data, search, user?.companyId],
  );
  const isDeletedView = registryView === "deleted";

  function setParam(key: string, value?: string) {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  }

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["bids"] });
    void queryClient.invalidateQueries({ queryKey: ["contracts"] });
    void queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  const statusMutation = useAppMutation({
    messages: {
      success: (bid) => bid.status === "ACCEPTED" && bid.contract ? "Contract created" : "Bid status updated",
    },
    mutationFn: ({ bid, status: nextStatus }: { bid: BidRecord; status: Extract<BidStatus, "ACCEPTED" | "REJECTED" | "WITHDRAWN"> }) =>
      changeBidStatus(bid.id, nextStatus),
    onSuccess: (updatedBid) => {
      setPendingAction(null);
      if (updatedBid.status === "ACCEPTED" && updatedBid.contract) {
        setSelectedBid(updatedBid);
      }
      refresh();
    },
  });

  const boostMutation = useAppMutation({
    messages: { success: "Bid boosted" },
    mutationFn: () => boostBid(boostBidTarget?.id ?? "", Number(boostCredits)),
    onSuccess: () => {
      setBoostBidTarget(null);
      setBoostCredits("1");
      refresh();
    },
  });

  const editMutation = useAppMutation({
    messages: { success: "Bid updated" },
    mutationFn: (bidId: string) =>
      updateBid(bidId, {
        currency: editValues.currency,
        estimatedDeliveryAt: editValues.estimatedDeliveryAt || undefined,
        estimatedPickupAt: editValues.estimatedPickupAt || undefined,
        message: editValues.message,
        offeredPriceAmount: editValues.offeredPriceAmount,
      }),
    onSuccess: () => {
      setEditingBidId(null);
      refresh();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBid,
    onSuccess: (deletedBid) => {
      refresh();
      toast.success("Bid deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreMutation.mutate(deletedBid.id),
        },
      });
    },
  });

  const restoreMutation = useAppMutation({
    messages: { success: "Bid restored" },
    mutationFn: restoreBid,
    onSuccess: refresh,
  });

  const replyMutation = useAppMutation({
    messages: { success: "Reply sent" },
    mutationFn: (message: string) => createBidReply(selectedBid?.id ?? "", { message }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["bids", selectedBid?.id, "replies"] }),
  });

  if (bidsQuery.isLoading) return <LoadingState description="Loading received and sent bid work queues." title="Loading bids" />;
  if (bidsQuery.error) return <ErrorState description="The bids workspace could not be loaded." error={bidsQuery.error} title="Unable to load bids" />;

  return (
    <div className="space-y-6">
      <PageHeader
        subtitle="Review received bids, track sent offers, and move accepted work into contracts."
        title="Bids"
      />

      <Surface className="border-blue-100 bg-blue-50">
        <div className="flex flex-col gap-2 text-sm leading-6 text-muted md:flex-row md:items-center md:justify-between">
          <p>
            <span className="font-semibold text-foreground">Marketplace rule:</span> accepting a bid creates the contract automatically.
          </p>
          <p>Boosted bids rank higher for the shipper, but the shipper still chooses the winning bid.</p>
        </div>
      </Surface>

      <Surface>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex rounded-xl border border-border bg-surface-pearl p-2 sm:w-auto">
              {scopes.map((item) => (
                <button
                  className={`flex justify-center items-center  min-h-7 min-w-20 rounded-md px-3 text-xs font-normal transition  ${safeScope === item.value ? "bg-primary text-primary-foreground shadow-sm" : "text-muted hover:bg-card hover:text-foreground"}`}
                  key={item.value}
                  onClick={() => setParam("scope", item.value)}
                  type="button"
                >
                  <span className={"text-xs h-fit"}>{item.label}</span>
                </button>
              ))}
            </div>
            <div className="inline-flex w-fit rounded-lg border border-border bg-surface-pearl p-1" aria-label="Bid registry view">
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
                onClick={() => {
                  setSelectedBid(null);
                  setEditingBidId(null);
                  setRegistryView("deleted");
                }}
                type="button"
                variant={isDeletedView ? "secondary" : "ghost"}
              >
                Deleted
              </Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-[180px_minmax(240px,360px)]">
            <Field label="Status">
              <Select onChange={(event) => setParam("status", event.target.value)} value={status ?? "ALL"}>
                {statuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : humanizeEnum(item)}</option>)}
              </Select>
            </Field>
            <Field label="Search">
              <div className="relative">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
                <Input className="pl-9" onChange={(event) => setSearch(event.target.value)} placeholder="Company, route, post, message" value={search} />
              </div>
            </Field>
          </div>
        </div>
        {postId ? (
          <div className="mt-4 inline-flex items-center gap-2 rounded-lg bg-surface-pearl px-3 py-2 text-sm text-muted">
            <Filter aria-hidden="true" className="size-4" />
            Filtered by post {postId.slice(0, 8)}
            <button className="font-semibold text-primary" onClick={() => setParam("postId")} type="button">Clear</button>
          </div>
        ) : null}
      </Surface>

      {bids.length === 0 ? (
        <EmptyState
          description={isDeletedView ? "Deleted bids will appear here when they match this queue and filter set." : "No bids match this queue and filter set."}
          title={isDeletedView ? "No deleted bids found" : "No bids found"}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Post and route</Th>
              <Th>Counterparty</Th>
              <Th>Offer</Th>
              <Th>Status</Th>
              <Th>Next action</Th>
            </tr>
          </thead>
          <tbody>
            {bids.map((bid) => {
              const { canBoost, canDecide, canManageOwn, ownsBid, ownsPost } = canUseBidActions(bid, user?.companyId, user?.role);
              const canRestoreDeleted = user?.role === "COMPANY_ADMIN" && ownsBid;

              return (
                <Fragment key={bid.id}>
                  <tr>
                    <Td>
                      <Link className="font-semibold text-primary" to={`/posts/${bid.postId}`}>
                        {bid.post.title ?? `Post ${bid.postId.slice(0, 8)}`}
                      </Link>
                      {isBidBoosted(bid) ? <span className="ml-2 rounded-md bg-blue-50 px-2 py-1 text-xs font-semibold text-primary">Boosted bid</span> : null}
                      <p className="mt-1 text-sm text-muted">{routeLabel(bid)}</p>
                      <p className="mt-1 text-xs text-muted">{routeMeta(bid)}</p>
                    </Td>
                    <Td>
                      <p className="font-semibold">{counterpartyLabel(bid, user?.companyId)}</p>
                      <p className="mt-1 text-xs text-muted">{ownsPost ? "Bidding company" : "Post owner"}</p>
                    </Td>
                    <Td>
                      <p className="font-semibold">{formatCurrency(bid.offeredPriceAmount, bid.currency)}</p>
                      <p className="mt-1 text-xs text-muted">Pickup {formatDateTime(bid.estimatedPickupAt)}</p>
                      <p className="mt-1 text-xs text-muted">Delivery {formatDateTime(bid.estimatedDeliveryAt)}</p>
                    </Td>
                    <Td><StatusBadge tone={isDeletedView ? "danger" : bidTone(bid.status)}>{isDeletedView ? "Deleted" : humanizeEnum(bid.status)}</StatusBadge></Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <Button className="h-9 min-h-9 px-3" onClick={() => setSelectedBid(bid)} type="button" variant="secondary">
                          <PanelRightOpen className="size-4" /> Details
                        </Button>
                        {isDeletedView ? (
                          canRestoreDeleted ? (
                            <Button className="h-9 min-h-9 px-3" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(bid.id)} type="button" variant="secondary">
                              <RotateCcw className="size-4" /> Restore
                            </Button>
                          ) : (
                            <span className="text-sm text-muted">Deleted by carrier</span>
                          )
                        ) : (
                          <>
                            {canDecide ? (
                              <>
                                <Button className="h-9 min-h-9 px-3" onClick={() => setPendingAction({ bid, status: "ACCEPTED" })} type="button">
                                  <Check className="size-4" /> Accept
                                </Button>
                                <Button className="h-9 min-h-9 px-3" onClick={() => setPendingAction({ bid, status: "REJECTED" })} type="button" variant="secondary">
                                  <X className="size-4" /> Reject
                                </Button>
                              </>
                            ) : null}
                            {canManageOwn ? (
                              <>
                                <Button className="h-9 min-h-9 px-3" onClick={() => { setEditingBidId(bid.id); setEditValues(emptyEditValues(bid)); }} type="button" variant="secondary">
                                  <Pencil className="size-4" /> Edit
                                </Button>
                                <Button className="h-9 min-h-9 px-3" onClick={() => setPendingAction({ bid, status: "WITHDRAWN" })} type="button" variant="secondary">
                                  <Undo2 className="size-4" /> Withdraw
                                </Button>
                                {canBoost ? (
                                  <Button className="h-9 min-h-9 px-3" onClick={() => setBoostBidTarget(bid)} type="button" variant="secondary">
                                    <Rocket className="size-4" /> Boost
                                  </Button>
                                ) : null}
                                <Button className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(bid.id)} type="button" variant="danger">
                                  <Trash2 className="size-4" /> Delete
                                </Button>
                              </>
                            ) : null}
                          </>
                        )}
                        {bid.contract ? (
                          <Link className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-primary bg-card px-3 text-sm font-semibold text-primary" to={`/contracts/${bid.contract.id}`}>
                            <ExternalLink className="size-4" /> Open contract
                          </Link>
                        ) : null}
                        {!isDeletedView && !canDecide && !canManageOwn && !bid.contract ? <span className="text-sm text-muted">No action</span> : null}
                      </div>
                    </Td>
                  </tr>

                  {editingBidId === bid.id ? (
                    <tr>
                      <td className="border-b border-border px-4 py-4" colSpan={5}>
                        <div className="grid gap-4 rounded-xl bg-surface-pearl p-4 md:grid-cols-2">
                          <Field label="Offered price"><Input inputMode="decimal" onChange={(event) => setEditValues({ ...editValues, offeredPriceAmount: event.target.value })} value={editValues.offeredPriceAmount} /></Field>
                          <Field label="Currency"><Input onChange={(event) => setEditValues({ ...editValues, currency: event.target.value })} value={editValues.currency} /></Field>
                          <Field label="Pickup estimate"><Input onChange={(event) => setEditValues({ ...editValues, estimatedPickupAt: event.target.value })} type="datetime-local" value={editValues.estimatedPickupAt} /></Field>
                          <Field label="Delivery estimate"><Input onChange={(event) => setEditValues({ ...editValues, estimatedDeliveryAt: event.target.value })} type="datetime-local" value={editValues.estimatedDeliveryAt} /></Field>
                          <div className="md:col-span-2"><Field label="Message"><Textarea onChange={(event) => setEditValues({ ...editValues, message: event.target.value })} value={editValues.message} /></Field></div>
                          <div className="flex flex-wrap gap-2 md:col-span-2">
                            <Button disabled={editMutation.isPending} onClick={() => editMutation.mutate(bid.id)} type="button">Save bid</Button>
                            <Button onClick={() => setEditingBidId(null)} type="button" variant="ghost">Cancel</Button>
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

      {pendingAction ? (
        <Surface>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">
                {pendingAction.status === "ACCEPTED" ? "Accept bid and create contract?" : `Confirm ${humanizeEnum(pendingAction.status).toLowerCase()}`}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {pendingAction.status === "ACCEPTED"
                  ? `${pendingAction.bid.post.title ?? "This bid"} will be accepted, competing pending bids will close, and a contract will be created automatically.`
                  : `${pendingAction.bid.post.title ?? "This bid"} will move to ${humanizeEnum(pendingAction.status).toLowerCase()}.`}
              </p>
              {pendingAction.status === "ACCEPTED" ? (
                <p className="mt-2 text-xs font-semibold text-primary">After confirmation, use Open contract to continue lifecycle work.</p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button disabled={statusMutation.isPending} onClick={() => statusMutation.mutate(pendingAction)} type="button">Confirm</Button>
              <Button onClick={() => setPendingAction(null)} type="button" variant="ghost">Cancel</Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {boostBidTarget ? (
        <Surface>
          <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
            <div>
              <h2 className="text-xl font-semibold">Boost bid ranking</h2>
              <p className="mt-1 text-sm text-muted">Higher boost spend ranks this bid higher for the shipper. The other side sees only a boosted label, not the exact credits.</p>
            </div>
            <Field label="Credits">
              <Input min={1} onChange={(event) => setBoostCredits(event.target.value)} type="number" value={boostCredits} />
            </Field>
            <div className="flex gap-2">
              <Button disabled={boostMutation.isPending || Number(boostCredits) < 1} onClick={() => boostMutation.mutate()} type="button">Boost bid</Button>
              <Button onClick={() => setBoostBidTarget(null)} type="button" variant="ghost">Cancel</Button>
            </div>
          </div>
        </Surface>
      ) : null}

      {selectedBid ? (
        <div aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-black/30 p-3 backdrop-blur-[1px]" role="dialog">
          <div className="flex h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-border bg-surface-pearl px-5 py-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Bid details</p>
                <h2 className="mt-1 text-xl font-semibold">{selectedBid.post.title ?? `Post ${selectedBid.postId.slice(0, 8)}`}</h2>
                <p className="mt-1 text-sm text-muted">{routeLabel(selectedBid)}</p>
              </div>
              <button
                aria-label="Close bid details"
                className="grid size-10 place-items-center rounded-lg border border-border bg-card text-muted hover:text-foreground"
                onClick={() => setSelectedBid(null)}
                type="button"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border border-border bg-surface-pearl p-4">
                  <p className="text-xs font-semibold uppercase text-muted">Status</p>
                  <div className="mt-2 flex flex-wrap gap-2"><StatusBadge tone={bidTone(selectedBid.status)}>{humanizeEnum(selectedBid.status)}</StatusBadge>{isBidBoosted(selectedBid) ? <StatusBadge tone="success">Boosted bid</StatusBadge> : null}</div>
                </div>
                <div className="rounded-lg border border-border bg-surface-pearl p-4">
                  <p className="text-xs font-semibold uppercase text-muted">Offer</p>
                  <p className="mt-2 text-lg font-semibold">{formatCurrency(selectedBid.offeredPriceAmount, selectedBid.currency)}</p>
                </div>
                <div className="rounded-lg border border-border bg-surface-pearl p-4">
                  <p className="text-xs font-semibold uppercase text-muted">Counterparty</p>
                  <p className="mt-2 text-sm font-semibold">{counterpartyLabel(selectedBid, user?.companyId)}</p>
                </div>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <Surface className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <MessageSquareText className="size-4 text-primary" />
                    <h3 className="font-semibold">Bid message</h3>
                  </div>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                    {selectedBid.message || "No message was added to this bid."}
                  </p>
                </Surface>

                <Surface className="p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Clock3 className="size-4 text-primary" />
                    <h3 className="font-semibold">Timing and route</h3>
                  </div>
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-xs font-semibold uppercase text-muted">Pickup estimate</dt>
                      <dd className="mt-1">{formatDateTime(selectedBid.estimatedPickupAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-muted">Delivery estimate</dt>
                      <dd className="mt-1">{formatDateTime(selectedBid.estimatedDeliveryAt)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase text-muted">Distance / duration</dt>
                      <dd className="mt-1">{routeMeta(selectedBid)}</dd>
                    </div>
                  </dl>
                </Surface>
              </div>

              <Surface className="mt-5 p-4">
                <WorkflowReplyThread
                  currentCompanyId={user?.companyId}
                  currentUserId={user?.id}
                  error={repliesQuery.error}
                  isLoading={repliesQuery.isLoading}
                  isSending={replyMutation.isPending}
                  onSend={(message) => replyMutation.mutate(message)}
                  replies={repliesQuery.data}
                  title="Bid replies"
                />
              </Surface>

              <Surface className="mt-5 p-4">
                <h3 className="font-semibold">Activity timeline</h3>
                {activitiesQuery.isLoading ? (
                  <p className="mt-3 text-sm text-muted">Loading activity...</p>
                ) : activitiesQuery.error ? (
                  <p className="mt-3 text-sm text-danger">Activity could not be loaded.</p>
                ) : activitiesQuery.data?.length ? (
                  <ol className="mt-4 space-y-3">
                    {activitiesQuery.data.map((activity) => (
                      <li className="relative border-l border-border pl-4" key={activity.id}>
                        <span className="absolute -left-[5px] top-1 size-2 rounded-full bg-primary" />
                        <p className="text-sm font-semibold">{activityMessage(activity)}</p>
                        <p className="mt-1 text-xs text-muted">{formatDateTime(activity.createdAt)}</p>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="mt-3 text-sm text-muted">No activity has been recorded for this bid yet.</p>
                )}
              </Surface>
            </div>

            <div className="border-t border-border bg-surface-pearl px-5 py-4">
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const { canBoost, canDecide, canManageOwn } = canUseBidActions(selectedBid, user?.companyId, user?.role);
                  return (
                    <>
                      <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-primary hover:text-primary" to={`/posts/${selectedBid.postId}`}>
                        <ExternalLink className="size-4" /> Open post
                      </Link>
                      {canDecide ? (
                        <>
                          <Button onClick={() => setPendingAction({ bid: selectedBid, status: "ACCEPTED" })} type="button">
                            <Check className="size-4" /> Accept
                          </Button>
                          <Button onClick={() => setPendingAction({ bid: selectedBid, status: "REJECTED" })} type="button" variant="secondary">
                            <X className="size-4" /> Reject
                          </Button>
                        </>
                      ) : null}
                      {canManageOwn ? (
                        <>
                          <Button onClick={() => { setEditingBidId(selectedBid.id); setEditValues(emptyEditValues(selectedBid)); setSelectedBid(null); }} type="button" variant="secondary">
                            <Pencil className="size-4" /> Edit in table
                          </Button>
                          <Button onClick={() => setPendingAction({ bid: selectedBid, status: "WITHDRAWN" })} type="button" variant="secondary">
                            <Undo2 className="size-4" /> Withdraw
                          </Button>
                          {canBoost ? (
                            <Button onClick={() => setBoostBidTarget(selectedBid)} type="button" variant="secondary">
                              <Rocket className="size-4" /> Boost
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                      {selectedBid.contract ? (
                        <Link className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-primary bg-card px-3 py-2 text-sm font-semibold text-primary" to={`/contracts/${selectedBid.contract.id}`}>
                          <ExternalLink className="size-4" /> Open contract
                        </Link>
                      ) : null}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

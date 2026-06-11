import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ImageIcon, Pencil, RotateCcw, Trash2, Truck } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  deleteVehicleMarketplaceListing,
  listMyVehicleMarketplaceListings,
  restoreVehicleMarketplaceListing,
  updateVehicleMarketplaceListing,
  type VehicleMarketplaceListing,
} from "@/shared/api/modules/vehicleMarketplace";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { formatListingLocation, formatListingPrice, formatVehicleSpec, marketplaceStatusTone } from "./vehicleMarketplaceFormatters";
import type { MarketplaceBillingMetadata } from "@/shared/api/modules/posts";
import { listingImages } from "./vehicleMarketplaceMedia";

const ownerStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "SOLD", "RENTED", "CLOSED"] as const;

type OwnerListingCardProps = {
  changeStatus: (id: string, currentStatus: string, nextStatus: (typeof ownerStatuses)[number]) => void;
  deletePending: boolean;
  listing: VehicleMarketplaceListing;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  restorePending: boolean;
  statusPending: boolean;
};

function OwnerListingCard({ changeStatus, deletePending, listing, onDelete, onRestore, restorePending, statusPending }: OwnerListingCardProps) {
  const images = listingImages(listing);
  const cover = images[0]?.url;
  return (
    <article className="grid overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:grid-cols-[16rem_1fr]">
      <Link className="relative min-h-48 bg-surface-pearl" to={`/vehicle-marketplace/${listing.id}`}>
        {cover ? (
          <img alt={listing.title} className="absolute inset-0 size-full object-cover" src={cover} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#f7f7f8,#e8edf4)] text-muted">
            <Truck className="size-11" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {listing.deletedAt ? <StatusBadge tone="danger">Deleted</StatusBadge> : <StatusBadge tone="success">Active</StatusBadge>}
          {images.length ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white">
              <ImageIcon className="size-3.5" aria-hidden="true" />
              {images.length}
            </span>
          ) : null}
        </div>
      </Link>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">{humanizeEnum(listing.intent)} / {humanizeEnum(listing.sourceType)}</p>
            <Link className="mt-1 inline-flex items-center gap-2 text-2xl font-semibold tracking-normal hover:text-primary" to={`/vehicle-marketplace/${listing.id}`}>
              {listing.title}
              <ArrowUpRight className="size-5 text-muted" aria-hidden="true" />
            </Link>
          </div>
          <StatusBadge tone={marketplaceStatusTone(listing.status)}>{humanizeEnum(listing.status)}</StatusBadge>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-surface-pearl p-3"><p className="text-xs font-semibold uppercase text-muted">Vehicle</p><p className="mt-1 text-sm font-semibold">{formatVehicleSpec(listing)}</p></div>
          <div className="rounded-lg bg-surface-pearl p-3"><p className="text-xs font-semibold uppercase text-muted">Location</p><p className="mt-1 text-sm font-semibold">{formatListingLocation(listing)}</p></div>
          <div className="rounded-lg bg-surface-pearl p-3"><p className="text-xs font-semibold uppercase text-muted">Price</p><p className="mt-1 text-sm font-semibold">{formatListingPrice(listing)}</p></div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="h-9 min-w-36"
            disabled={statusPending || Boolean(listing.deletedAt)}
            onChange={(event) => changeStatus(listing.id, listing.status, event.target.value as (typeof ownerStatuses)[number])}
            value={listing.status}
          >
            {ownerStatuses.map((status) => <option key={status} value={status}>{humanizeEnum(status)}</option>)}
          </Select>
          {listing.deletedAt ? (
            <Button className="h-9 min-h-9 px-3" disabled={restorePending} onClick={() => window.confirm("Restore this listing to owner management?") && onRestore(listing.id)} type="button" variant="secondary">
              <RotateCcw className="size-4" aria-hidden="true" />
              Restore
            </Button>
          ) : (
            <>
              <Link className="inline-flex min-h-9 items-center justify-center gap-2 rounded-lg border border-primary bg-card px-3 py-1.5 text-sm text-primary" to={`/vehicle-marketplace/${listing.id}/edit`}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit
              </Link>
              <Button className="h-9 min-h-9 px-3" disabled={deletePending} onClick={() => window.confirm("Delete this listing? It will be hidden from public browse.") && onDelete(listing.id)} type="button" variant="danger">
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export function VehicleMarketplaceMinePage() {
  const queryClient = useQueryClient();
  const [billingResult, setBillingResult] = useState<MarketplaceBillingMetadata | null>(null);
  const query = useQuery({
    queryFn: () => listMyVehicleMarketplaceListings({ includeDeleted: true }),
    queryKey: ["vehicle-marketplace", "mine", "include-deleted"],
  });
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["vehicle-marketplace"] });
  const statusMutation = useAppMutation({
    messages: { success: "Listing status updated" },
    mutationFn: ({ id, status }: { id: string; status: (typeof ownerStatuses)[number] }) => updateVehicleMarketplaceListing(id, { status }),
    onSuccess: (listing) => {
      setBillingResult(listing.billing ?? null);
      invalidate();
    },
  });
  const deleteMutation = useAppMutation({
    messages: { success: "Listing deleted" },
    mutationFn: deleteVehicleMarketplaceListing,
    onSuccess: () => {
      setBillingResult(null);
      invalidate();
    },
  });
  const restoreMutation = useAppMutation({
    messages: { success: "Listing restored" },
    mutationFn: restoreVehicleMarketplaceListing,
    onSuccess: () => {
      setBillingResult(null);
      invalidate();
    },
  });

  const changeStatus = (id: string, currentStatus: string, nextStatus: (typeof ownerStatuses)[number]) => {
    if (currentStatus === nextStatus) return;
    if (nextStatus === "PUBLISHED" && !window.confirm("Publish this listing now? If quota is exhausted, credits may be spent.")) return;
    if (["SOLD", "RENTED", "CLOSED"].includes(nextStatus) && !window.confirm(`Move this listing to ${humanizeEnum(nextStatus)}?`)) return;
    statusMutation.mutate({ id, status: nextStatus });
  };

  const billingCopy = billingResult
    ? billingResult.mode === "CREDITS"
      ? `${billingResult.creditCost} credits spent. Wallet balance: ${billingResult.walletBalanceCredits}.`
      : "Included listing quota was used for this publish action."
    : null;

  if (query.isLoading) return <LoadingState description="Loading your vehicle marketplace listings." title="Loading my listings" />;
  if (query.error) return <ErrorState description="Your vehicle marketplace listings could not be loaded." error={query.error} title="Unable to load my listings" />;

  const listings = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        action={<Link className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" to="/vehicle-marketplace/new">Create listing</Link>}
        eyebrow="Vehicle marketplace"
        subtitle="Manage your draft, published, paused, sold, rented, and closed listings."
        title="My vehicle listings"
      />
      {billingCopy ? (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-foreground">{billingCopy}</div>
      ) : null}
      {listings.length === 0 ? (
        <EmptyState action={<Link className="text-sm font-semibold text-primary" to="/vehicle-marketplace/new">Create your first listing</Link>} description="Your company or job-seeker vehicle listings will appear here." title="No owned listings" />
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => (
            <OwnerListingCard
              changeStatus={changeStatus}
              deletePending={deleteMutation.isPending}
              key={listing.id}
              listing={listing}
              onDelete={(id) => deleteMutation.mutate(id)}
              onRestore={(id) => restoreMutation.mutate(id)}
              restorePending={restoreMutation.isPending}
              statusPending={statusMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

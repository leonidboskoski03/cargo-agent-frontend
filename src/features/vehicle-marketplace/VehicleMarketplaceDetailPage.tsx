import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeDollarSign, Building2, Calendar, ChevronLeft, ChevronRight, MapPin, Pencil, Send, Trash2, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createVehicleMarketplaceInquiry, deleteVehicleMarketplaceListing, getVehicleMarketplaceListing, updateVehicleMarketplaceListing } from "@/shared/api/modules/vehicleMarketplace";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { Field, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { formatIntent, formatListingLocation, formatListingOwner, formatListingPrice, formatRegistrationStatus, formatVehicleSpec, marketplaceStatusTone } from "./vehicleMarketplaceFormatters";
import { listingImages } from "./vehicleMarketplaceMedia";

const ownerStatuses = ["DRAFT", "PUBLISHED", "PAUSED", "SOLD", "RENTED", "CLOSED"] as const;

export function VehicleMarketplaceDetailPage() {
  const { listingId = "" } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const query = useQuery({ queryFn: () => getVehicleMarketplaceListing(listingId), queryKey: ["vehicle-marketplace", listingId] });
  const [message, setMessage] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const inquiryMutation = useAppMutation({
    messages: { success: "Inquiry sent" },
    mutationFn: () => createVehicleMarketplaceInquiry(listingId, { message }),
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["vehicle-marketplace", "inquiries"] });
    },
  });
  const statusMutation = useAppMutation({
    messages: { success: "Listing status updated" },
    mutationFn: (status: (typeof ownerStatuses)[number]) => updateVehicleMarketplaceListing(listingId, { status }),
    onSuccess: (updated) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicle-marketplace"] });
      queryClient.setQueryData(["vehicle-marketplace", listingId], updated);
    },
  });
  const deleteMutation = useAppMutation({
    messages: { success: "Listing deleted" },
    mutationFn: () => deleteVehicleMarketplaceListing(listingId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicle-marketplace"] });
      navigate("/vehicle-marketplace/mine");
    },
  });

  if (query.isLoading) return <LoadingState description="Loading vehicle listing details." title="Loading listing" />;
  if (query.error) return <ErrorState description="The vehicle listing could not be loaded." error={query.error} title="Unable to load listing" />;

  const listing = query.data;
  if (!listing) return <EmptyState description="This listing is not available or is not visible to your role." title="Listing not found" />;

  const ownsListing = listing.ownerUserId === user?.id || (user?.companyId && listing.ownerCompanyId === user.companyId);
  const canInquire = !ownsListing && (user?.role === "COMPANY_ADMIN" || user?.role === "JOB_SEEKER") && listing.status === "PUBLISHED";
  const images = listingImages(listing);
  const activeImage = images[activeImageIndex]?.url;
  const nextImage = () => setActiveImageIndex((index) => (images.length ? (index + 1) % images.length : 0));
  const previousImage = () => setActiveImageIndex((index) => (images.length ? (index - 1 + images.length) % images.length : 0));

  const submitInquiry = (event: FormEvent) => {
    event.preventDefault();
    inquiryMutation.mutate();
  };
  const changeStatus = (nextStatus: (typeof ownerStatuses)[number]) => {
    if (nextStatus === listing.status) return;
    if (nextStatus === "PUBLISHED" && !window.confirm("Publish this listing now? If quota is exhausted, credits may be spent.")) return;
    if (["SOLD", "RENTED", "CLOSED"].includes(nextStatus) && !window.confirm(`Move this listing to ${humanizeEnum(nextStatus)}?`)) return;
    statusMutation.mutate(nextStatus);
  };

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-primary" to="/vehicle-marketplace">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to vehicle market
      </Link>
      <PageHeader
        action={
          ownsListing ? (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-card px-4 py-2 text-sm text-primary" to={`/vehicle-marketplace/${listing.id}/edit`}>
              <Pencil className="size-4" aria-hidden="true" />
              Edit listing
            </Link>
          ) : null
        }
        eyebrow="Vehicle listing"
        subtitle={listing.description ?? "Inspect vehicle details and send an inquiry when allowed."}
        title={listing.title}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-5">
          <Surface className="overflow-hidden p-0">
            <div className="relative aspect-[16/9] bg-surface-pearl">
              {activeImage ? (
                <img alt={`${listing.title} image ${activeImageIndex + 1}`} className="size-full object-cover" src={activeImage} />
              ) : (
                <div className="grid size-full place-items-center bg-[linear-gradient(135deg,#f8fafc,#e7ebf1)] text-muted">
                  <div className="text-center">
                    <Truck className="mx-auto size-16" aria-hidden="true" />
                    <p className="mt-3 text-sm font-semibold">No vehicle photos uploaded</p>
                  </div>
                </div>
              )}
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <StatusBadge tone={marketplaceStatusTone(listing.status)}>{humanizeEnum(listing.status)}</StatusBadge>
                <span className="rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white">{formatIntent(listing.intent)}</span>
              </div>
              {images.length > 1 ? (
                <>
                  <button aria-label="Previous image" className="absolute left-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75" onClick={previousImage} type="button">
                    <ChevronLeft className="size-5" aria-hidden="true" />
                  </button>
                  <button aria-label="Next image" className="absolute right-3 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-black/55 text-white transition hover:bg-black/75" onClick={nextImage} type="button">
                    <ChevronRight className="size-5" aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
            {images.length ? (
              <div className="flex gap-2 overflow-x-auto border-t border-border bg-card p-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {images.map((image, index) => (
                  <button
                    aria-label={`Show image ${index + 1}`}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border ${index === activeImageIndex ? "border-primary ring-2 ring-primary/20" : "border-border"}`}
                    key={`${image.url}-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                    type="button"
                  >
                    <img alt={image.name ?? `${listing.title} thumbnail ${index + 1}`} className="size-full object-cover" src={image.url} />
                  </button>
                ))}
              </div>
            ) : null}
          </Surface>

          <Surface>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SpecPill icon={Truck} label="Vehicle" value={formatVehicleSpec(listing)} />
              <SpecPill icon={MapPin} label="Location" value={formatListingLocation(listing)} />
              <SpecPill icon={Calendar} label="Year" value={listing.year ? String(listing.year) : "Not set"} />
              <SpecPill icon={BadgeDollarSign} label="Price" value={formatListingPrice(listing)} />
            </div>
          </Surface>

          <Surface>
            <h2 className="text-xl font-semibold">Vehicle information</h2>
            <div className="mt-5 rounded-lg border border-border bg-surface-pearl p-4">
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-muted">
                <Building2 className="size-4 text-primary" aria-hidden="true" />
                Seller
              </p>
              <p className="mt-2 text-2xl font-semibold tracking-normal text-foreground">{formatListingOwner(listing)}</p>
              <p className="mt-1 text-sm text-muted">{formatListingLocation(listing)}</p>
            </div>
            <dl className="mt-5 grid gap-4 md:grid-cols-2">
              <InfoItem label="Price" value={formatListingPrice(listing)} />
              <InfoItem label="Vehicle type" value={`${humanizeEnum(listing.vehicleType)}${listing.bodyType ? ` / ${humanizeEnum(listing.bodyType)}` : ""}`} />
              <InfoItem label="Brand / model" value={[listing.brand, listing.model].filter(Boolean).join(" ") || "Not set"} />
              <InfoItem label="Year" value={listing.year ? String(listing.year) : "Not set"} />
              <InfoItem label="Registration" value={formatRegistrationStatus(listing)} />
              <InfoItem label="Location" value={formatListingLocation(listing)} />
            </dl>
          </Surface>

          <Surface>
            <h2 className="text-xl font-semibold">Seller description</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-muted">{listing.description ?? "No detailed seller description has been added yet."}</p>
          </Surface>
        </div>

        <Surface>
          {ownsListing ? (
            <div className="mb-5 rounded-lg border border-border bg-surface-pearl p-4">
              <h2 className="text-lg font-semibold">Owner controls</h2>
              <p className="mt-1 text-sm text-muted">Update listing visibility or close the ad when the vehicle is sold, rented, or no longer available.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <Field label="Listing status">
                  <Select disabled={statusMutation.isPending} onChange={(event) => changeStatus(event.target.value as (typeof ownerStatuses)[number])} value={listing.status}>
                    {ownerStatuses.map((status) => <option key={status} value={status}>{humanizeEnum(status)}</option>)}
                  </Select>
                </Field>
                <Link className="inline-flex min-h-10 items-center justify-center gap-2 self-end rounded-lg border border-primary bg-card px-4 py-2 text-sm font-semibold text-primary" to={`/vehicle-marketplace/${listing.id}/edit`}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Edit
                </Link>
                <Button className="self-end" disabled={deleteMutation.isPending} onClick={() => window.confirm("Delete this listing? It will be hidden from public browse.") && deleteMutation.mutate()} type="button" variant="danger">
                  <Trash2 className="size-4" aria-hidden="true" />
                  Delete
                </Button>
              </div>
              {listing.billing ? (
                <p className="mt-3 text-xs font-semibold text-muted">
                  {listing.billing.mode === "CREDITS"
                    ? `${listing.billing.creditCost} credits spent. Wallet balance: ${listing.billing.walletBalanceCredits}.`
                    : "Included listing quota was used for this publish action."}
                </p>
              ) : null}
            </div>
          ) : null}
          {canInquire ? (
            <form className="space-y-4" onSubmit={submitInquiry}>
              <div>
                <h2 className="text-xl font-semibold">Send inquiry</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Ask for availability, condition, documents, or next steps.</p>
              </div>
              <Field label="Message" required>
                <Textarea onChange={(event) => setMessage(event.target.value)} placeholder="Is this truck available next month?" value={message} />
              </Field>
              <Button disabled={inquiryMutation.isPending || message.trim().length < 3} type="submit">
                <Send className="size-4" aria-hidden="true" />
                Send inquiry
              </Button>
            </form>
          ) : (
            <EmptyState description={ownsListing ? "This is your listing. Manage inquiries from the inquiry workspace." : "Inquiry actions are not available for your role or this listing state."} title="No inquiry action" />
          )}
        </Surface>
      </div>
    </div>
  );
}

function SpecPill({ icon: Icon, label, value }: { icon: typeof Truck; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-pearl p-4">
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <p className="mt-3 text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold">{value}</p>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Filter, Gauge, ImageIcon, MapPin, Plus, Search, Snowflake, Truck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { listVehicleMarketplaceListings, type VehicleMarketplaceFilters, type VehicleMarketplaceListing } from "@/shared/api/modules/vehicleMarketplace";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { formatIntent, formatListingLocation, formatListingOwner, formatListingPrice, formatVehicleSpec, marketplaceStatusTone } from "./vehicleMarketplaceFormatters";
import { listingImages } from "./vehicleMarketplaceMedia";

const vehicleTypes = ["ALL", "TRUCK", "TRAILER", "VAN"];
const bodyTypes = ["ALL", "TILT", "BOX", "FLATBED", "REEFER", "TANKER"];
const intents = ["ALL", "SALE", "RENTAL", "LEASE"];
const yesNo = ["ALL", "true", "false"];

function paramValue(searchParams: URLSearchParams, key: string, fallback = "") {
  return searchParams.get(key) ?? fallback;
}

function filtersFromParams(searchParams: URLSearchParams) {
  return {
    bodyType: paramValue(searchParams, "bodyType", "ALL"),
    capacityMin: paramValue(searchParams, "capacityMin"),
    city: paramValue(searchParams, "city"),
    countryCode: paramValue(searchParams, "countryCode"),
    hazmatCertified: paramValue(searchParams, "hazmatCertified", "ALL"),
    intent: paramValue(searchParams, "intent", "ALL"),
    priceMax: paramValue(searchParams, "priceMax"),
    priceMin: paramValue(searchParams, "priceMin"),
    q: paramValue(searchParams, "q"),
    refrigerated: paramValue(searchParams, "refrigerated", "ALL"),
    vehicleType: paramValue(searchParams, "vehicleType", "ALL"),
    yearMax: paramValue(searchParams, "yearMax"),
    yearMin: paramValue(searchParams, "yearMin"),
  };
}

function toApiFilters(filters: ReturnType<typeof filtersFromParams>): VehicleMarketplaceFilters {
  return {
    bodyType: filters.bodyType === "ALL" ? undefined : filters.bodyType,
    capacityMin: filters.capacityMin ? Number(filters.capacityMin) : undefined,
    city: filters.city || undefined,
    countryCode: filters.countryCode || undefined,
    hazmatCertified: filters.hazmatCertified === "ALL" ? undefined : filters.hazmatCertified === "true",
    intent: filters.intent === "ALL" ? undefined : filters.intent,
    priceMax: filters.priceMax ? Number(filters.priceMax) : undefined,
    priceMin: filters.priceMin ? Number(filters.priceMin) : undefined,
    q: filters.q || undefined,
    refrigerated: filters.refrigerated === "ALL" ? undefined : filters.refrigerated === "true",
    vehicleType: filters.vehicleType === "ALL" ? undefined : filters.vehicleType,
    yearMax: filters.yearMax ? Number(filters.yearMax) : undefined,
    yearMin: filters.yearMin ? Number(filters.yearMin) : undefined,
  };
}

function ListingCard({ listing }: { listing: VehicleMarketplaceListing }) {
  const images = listingImages(listing);
  const heroImage = images[0]?.url;
  return (
    <Link
      className="group grid overflow-hidden rounded-xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 lg:grid-cols-[17rem_1fr]"
      to={`/vehicle-marketplace/${listing.id}`}
    >
      <div className="relative min-h-52 bg-surface-pearl lg:min-h-full">
        {heroImage ? (
          <img alt={listing.title} className="absolute inset-0 size-full object-cover" src={heroImage} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#f7f7f8,#e9edf3)] text-muted">
            <Truck className="size-12" aria-hidden="true" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          <StatusBadge tone={marketplaceStatusTone(listing.status)}>{humanizeEnum(listing.status)}</StatusBadge>
          {images.length > 1 ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white">
              <ImageIcon className="size-3.5" aria-hidden="true" />
              {images.length}
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-primary">{formatIntent(listing.intent)} · {formatListingLocation(listing)}</p>
            <h2 className="mt-1 line-clamp-2 text-2xl font-semibold tracking-normal text-foreground">{listing.title}</h2>
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">{listing.description ?? "No seller description yet."}</p>
          </div>
          <ArrowUpRight className="mt-1 size-5 shrink-0 text-muted transition group-hover:text-primary" aria-hidden="true" />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-surface-pearl p-3">
            <p className="text-xs font-semibold uppercase text-muted">Price</p>
            <p className="mt-1 font-semibold">{formatListingPrice(listing)}</p>
          </div>
          <div className="rounded-lg bg-surface-pearl p-3">
            <p className="text-xs font-semibold uppercase text-muted">Vehicle</p>
            <p className="mt-1 font-semibold">{formatVehicleSpec(listing)}</p>
          </div>
          <div className="rounded-lg bg-surface-pearl p-3">
            <p className="text-xs font-semibold uppercase text-muted">Seller</p>
            <p className="mt-1 truncate font-semibold">{formatListingOwner(listing)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-muted">
          {listing.capacityKg ? <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1"><Gauge className="size-3.5" />{listing.capacityKg} kg</span> : null}
          {listing.refrigerated ? <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1"><Snowflake className="size-3.5" />Refrigerated</span> : null}
          {listing.city ? <span className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1"><MapPin className="size-3.5" />{listing.city}</span> : null}
        </div>
      </div>
    </Link>
  );
}

export function VehicleMarketplacePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const appliedFilters = filtersFromParams(searchParams);
  const [draftFilters, setDraftFilters] = useState(appliedFilters);
  const canCreate = user?.role === "COMPANY_ADMIN" || user?.role === "JOB_SEEKER";
  const query = useQuery({
    queryFn: () => listVehicleMarketplaceListings(toApiFilters(appliedFilters)),
    queryKey: ["vehicle-marketplace", "feed", appliedFilters],
  });

  const updateFilter = (key: keyof typeof draftFilters, value: string) => setDraftFilters((current) => ({ ...current, [key]: value }));
  const applyFilters = (event?: FormEvent) => {
    event?.preventDefault();
    const next = new URLSearchParams();
    Object.entries(draftFilters).forEach(([key, value]) => {
      if (value && value !== "ALL") next.set(key, value);
    });
    setSearchParams(next);
  };
  const clearFilters = () => {
    setDraftFilters(filtersFromParams(new URLSearchParams()));
    setSearchParams(new URLSearchParams());
  };

  if (query.isLoading) return <LoadingState description="Loading published truck, trailer, and van listings." title="Loading vehicle marketplace" />;
  if (query.error) return <ErrorState description="Vehicle marketplace listings could not be loaded." error={query.error} title="Unable to load vehicle marketplace" />;

  const listings = query.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          canCreate ? (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" to="/vehicle-marketplace/new">
              <Plus className="size-4" aria-hidden="true" />
              Create listing
            </Link>
          ) : null
        }
        eyebrow="Vehicle marketplace"
        subtitle="Browse published trucks, trailers, and vans for sale, rental, or lease."
        title="Vehicle market"
      />

      <Surface>
        <form onSubmit={applyFilters}>
        <div className="grid gap-4 lg:grid-cols-[1fr_10rem_10rem_10rem_8rem_10rem_auto] lg:items-end">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
              <Input className="pl-9" onChange={(event) => updateFilter("q", event.target.value)} placeholder="Brand, model, city" value={draftFilters.q} />
            </div>
          </Field>
          <Field label="Intent">
            <Select onChange={(event) => updateFilter("intent", event.target.value)} value={draftFilters.intent}>
              {intents.map((item) => <option key={item} value={item}>{item === "ALL" ? "All intents" : humanizeEnum(item)}</option>)}
            </Select>
          </Field>
          <Field label="Vehicle">
            <Select onChange={(event) => updateFilter("vehicleType", event.target.value)} value={draftFilters.vehicleType}>
              {vehicleTypes.map((item) => <option key={item} value={item}>{item === "ALL" ? "All types" : humanizeEnum(item)}</option>)}
            </Select>
          </Field>
          <Field label="Body">
            <Select onChange={(event) => updateFilter("bodyType", event.target.value)} value={draftFilters.bodyType}>
              {bodyTypes.map((item) => <option key={item} value={item}>{item === "ALL" ? "All bodies" : humanizeEnum(item)}</option>)}
            </Select>
          </Field>
          <Field label="Country">
            <Input maxLength={2} onChange={(event) => updateFilter("countryCode", event.target.value.toUpperCase())} placeholder="MK" value={draftFilters.countryCode} />
          </Field>
          <Field label="City">
            <Input onChange={(event) => updateFilter("city", event.target.value)} placeholder="Skopje" value={draftFilters.city} />
          </Field>
          <Button type="submit">
            <Filter className="size-4" aria-hidden="true" />
            Apply
          </Button>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-6">
          <Field label="Price min"><Input inputMode="decimal" onChange={(event) => updateFilter("priceMin", event.target.value)} placeholder="5000" value={draftFilters.priceMin} /></Field>
          <Field label="Price max"><Input inputMode="decimal" onChange={(event) => updateFilter("priceMax", event.target.value)} placeholder="50000" value={draftFilters.priceMax} /></Field>
          <Field label="Year from"><Input inputMode="numeric" onChange={(event) => updateFilter("yearMin", event.target.value)} placeholder="2018" value={draftFilters.yearMin} /></Field>
          <Field label="Year to"><Input inputMode="numeric" onChange={(event) => updateFilter("yearMax", event.target.value)} placeholder="2026" value={draftFilters.yearMax} /></Field>
          <Field label="Capacity min"><Input inputMode="numeric" onChange={(event) => updateFilter("capacityMin", event.target.value)} placeholder="12000" value={draftFilters.capacityMin} /></Field>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Field label="Refrigerated">
              <Select onChange={(event) => updateFilter("refrigerated", event.target.value)} value={draftFilters.refrigerated}>
                {yesNo.map((item) => <option key={item} value={item}>{item === "ALL" ? "Any" : item === "true" ? "Yes" : "No"}</option>)}
              </Select>
            </Field>
            <Field label="Hazmat">
              <Select onChange={(event) => updateFilter("hazmatCertified", event.target.value)} value={draftFilters.hazmatCertified}>
                {yesNo.map((item) => <option key={item} value={item}>{item === "ALL" ? "Any" : item === "true" ? "Yes" : "No"}</option>)}
              </Select>
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={clearFilters} type="button" variant="secondary">Clear filters</Button>
        </div>
        </form>
      </Surface>

      {listings.length === 0 ? (
        <EmptyState
          action={canCreate ? <Link className="text-sm font-semibold text-primary" to="/vehicle-marketplace/new">Create a listing</Link> : null}
          description="No published vehicle listings match the current filters."
          title="No vehicle listings"
        />
      ) : (
        <div className="grid gap-4">
          {listings.map((listing) => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      )}
    </div>
  );
}

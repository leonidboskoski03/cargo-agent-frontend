import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CreditCard, ImageIcon, Save, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { uploadDocument } from "@/shared/api/modules/documents";
import { listSupportedCountries } from "@/shared/api/modules/geo";
import {
  getVehicleMarketplaceListing,
  updateVehicleMarketplaceListing,
  type VehicleMarketplaceListing,
  type VehicleMarketplaceListingInput,
} from "@/shared/api/modules/vehicleMarketplace";
import { Button } from "@/shared/components/ui/Button";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Checkbox, Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { fileToBase64 } from "@/shared/lib/files";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { parseMarketplaceImages } from "./vehicleMarketplaceMedia";

const vehicleTypes = ["TRUCK", "TRAILER", "VAN"] as const;
const bodyTypes = ["", "TILT", "BOX", "FLATBED", "REEFER", "TANKER"] as const;
const statuses = ["DRAFT", "PUBLISHED", "PAUSED", "SOLD", "RENTED", "CLOSED"] as const;

function listingToForm(listing: VehicleMarketplaceListing) {
  return {
    bodyType: listing.bodyType ?? "",
    brand: listing.brand ?? "",
    capacityKg: listing.capacityKg?.toString() ?? "",
    city: listing.city,
    countryCode: listing.countryCode,
    currency: listing.currency ?? "EUR",
    description: listing.description ?? "",
    hazmatCertified: Boolean(listing.hazmatCertified),
    intent: listing.intent,
    model: listing.model ?? "",
    priceAmount: listing.priceAmount?.toString() ?? "",
    refrigerated: Boolean(listing.refrigerated),
    status: listing.status,
    title: listing.title,
    vehicleType: listing.vehicleType,
    volumeM3: listing.volumeM3?.toString() ?? "",
    year: listing.year?.toString() ?? "",
  };
}

type EditVehicleMarketplaceListingFormProps = {
  countries: Array<{ code: string; name: string }>;
  listing: VehicleMarketplaceListing;
};

function EditVehicleMarketplaceListingForm({ countries, listing }: EditVehicleMarketplaceListingFormProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [form, setForm] = useState(() => listingToForm(listing));
  const [images, setImages] = useState(() => parseMarketplaceImages(listing.imageUrlsJson));
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const mutation = useAppMutation({
    messages: { success: "Vehicle marketplace listing updated" },
    mutationFn: (input: Partial<VehicleMarketplaceListingInput>) => updateVehicleMarketplaceListing(listing.id, input),
    onSuccess: (updatedListing) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicle-marketplace"] });
      navigate(`/vehicle-marketplace/${updatedListing.id}`);
    },
  });

  const update = (key: keyof ReturnType<typeof listingToForm>, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    setUploadError(null);
    try {
      const document = await uploadDocument({
        contentBase64: await fileToBase64(file),
        fileName: file.name,
        kind: "OTHER",
        metadataJson: { listingId: listing.id, purpose: "VEHICLE_MARKETPLACE_IMAGE" },
        mimeType: file.type || "application/octet-stream",
        name: file.name,
        ownerCompanyId: listing.ownerCompanyId ?? user?.companyId ?? undefined,
        ownerUserId: listing.ownerCompanyId ? undefined : listing.ownerUserId ?? user?.id,
      });
      if (document.url) setImages((current) => [...current, { name: document.name, url: document.url! }]);
    } catch (error) {
      setUploadError(error);
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      bodyType: form.bodyType ? (form.bodyType as VehicleMarketplaceListingInput["bodyType"]) : undefined,
      brand: form.brand.trim() || undefined,
      capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
      city: form.city.trim(),
      countryCode: form.countryCode.toUpperCase(),
      currency: form.currency.trim().toUpperCase() || undefined,
      description: form.description.trim() || undefined,
      hazmatCertified: form.hazmatCertified,
      imageUrlsJson: images.length ? images : null,
      intent: form.intent as VehicleMarketplaceListingInput["intent"],
      model: form.model.trim() || undefined,
      priceAmount: form.priceAmount || undefined,
      refrigerated: form.refrigerated,
      status: form.status as VehicleMarketplaceListingInput["status"],
      title: form.title.trim(),
      vehicleType: form.vehicleType as VehicleMarketplaceListingInput["vehicleType"],
      volumeM3: form.volumeM3 || undefined,
      year: form.year ? Number(form.year) : undefined,
    });
  };

  return (
    <Surface>
      <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
        <div className="flex items-start gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 lg:col-span-2">
          <CreditCard className="mt-0.5 size-5 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Publishing from draft or paused may consume quota or credits.</p>
            <p className="mt-1 text-sm leading-6 text-muted">Already published listings can be edited without another automatic charge.</p>
          </div>
        </div>
        <Field label="Title" required>
          <Input onChange={(event) => update("title", event.target.value)} value={form.title} />
        </Field>
        <Field label="Status" required>
          <Select onChange={(event) => update("status", event.target.value)} value={form.status}>
            {statuses.map((status) => <option key={status} value={status}>{humanizeEnum(status)}</option>)}
          </Select>
        </Field>
        <Field label="Intent" required>
          <Select onChange={(event) => update("intent", event.target.value)} value={form.intent}>
            <option value="SALE">Sale</option>
            <option value="RENTAL">Rental</option>
            <option value="LEASE">Lease</option>
          </Select>
        </Field>
        <Field label="Vehicle type" required>
          <Select onChange={(event) => update("vehicleType", event.target.value)} value={form.vehicleType}>
            {vehicleTypes.map((type) => <option key={type} value={type}>{humanizeEnum(type)}</option>)}
          </Select>
        </Field>
        <Field label="Country" required>
          <Select onChange={(event) => update("countryCode", event.target.value)} value={form.countryCode}>
            {countries.map((country) => (
              <option key={country.code} value={country.code}>{country.code} - {country.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="City" required>
          <Input onChange={(event) => update("city", event.target.value)} value={form.city} />
        </Field>
        <Field label="Brand">
          <Input onChange={(event) => update("brand", event.target.value)} value={form.brand} />
        </Field>
        <Field label="Model">
          <Input onChange={(event) => update("model", event.target.value)} value={form.model} />
        </Field>
        <Field label="Body type">
          <Select onChange={(event) => update("bodyType", event.target.value)} value={form.bodyType}>
            {bodyTypes.map((type) => <option key={type || "none"} value={type}>{type ? humanizeEnum(type) : "Not set"}</option>)}
          </Select>
        </Field>
        <Field label="Year">
          <Input inputMode="numeric" onChange={(event) => update("year", event.target.value)} value={form.year} />
        </Field>
        <Field label="Price amount">
          <Input inputMode="decimal" onChange={(event) => update("priceAmount", event.target.value)} value={form.priceAmount} />
        </Field>
        <Field label="Currency">
          <Input maxLength={3} onChange={(event) => update("currency", event.target.value.toUpperCase())} value={form.currency} />
        </Field>
        <Field label="Capacity kg">
          <Input inputMode="numeric" onChange={(event) => update("capacityKg", event.target.value)} value={form.capacityKg} />
        </Field>
        <Field label="Volume m3">
          <Input inputMode="decimal" onChange={(event) => update("volumeM3", event.target.value)} value={form.volumeM3} />
        </Field>
        <div className="rounded-lg bg-surface-pearl p-4 lg:col-span-2">
          <div className="flex flex-wrap gap-5">
            <Checkbox checked={form.refrigerated} onChange={(event) => update("refrigerated", event.target.checked)}>Refrigerated</Checkbox>
            <Checkbox checked={form.hazmatCertified} onChange={(event) => update("hazmatCertified", event.target.checked)}>Hazmat certified</Checkbox>
          </div>
        </div>
        <Field label="Description">
          <Textarea onChange={(event) => update("description", event.target.value)} value={form.description} />
        </Field>
        <div className="space-y-3 lg:col-span-2">
          <div>
            <h2 className="text-base font-semibold">Vehicle photos</h2>
            <p className="mt-1 text-sm text-muted">Add or remove photos for the marketplace gallery. The first image is the cover.</p>
          </div>
          <FileUploadControl
            accept="image/*"
            error={uploadError}
            isUploading={uploadingImage}
            onFileSelect={(file) => void uploadImage(file)}
            previewAlt="Last vehicle marketplace upload"
            previewUrl={images.at(-1)?.url}
            value={images.length ? `${images.length} image${images.length === 1 ? "" : "s"} uploaded` : ""}
          />
          {images.length ? (
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {images.map((image, index) => (
                <div className="group relative overflow-hidden rounded-lg border border-border bg-surface-pearl" key={`${image.url}-${index}`}>
                  <img alt={image.name ?? `Vehicle image ${index + 1}`} className="aspect-[4/3] w-full object-cover" src={image.url} />
                  <button
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute right-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                    onClick={() => setImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    type="button"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                  {index === 0 ? <span className="absolute bottom-2 left-2 rounded-md bg-black/65 px-2 py-1 text-xs font-semibold text-white">Cover</span> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-surface-pearl px-4 py-3 text-sm text-muted">
              <ImageIcon className="size-4" aria-hidden="true" />
              No photos uploaded yet.
            </div>
          )}
        </div>
        <div className="flex items-end lg:col-span-2">
          <Button disabled={mutation.isPending || form.title.trim().length < 3 || !form.city.trim()} type="submit">
            <Save className="size-4" aria-hidden="true" />
            Save listing
          </Button>
        </div>
      </form>
    </Surface>
  );
}

export function EditVehicleMarketplaceListingPage() {
  const { listingId = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const listingQuery = useQuery({ queryFn: () => getVehicleMarketplaceListing(listingId), queryKey: ["vehicle-marketplace", listingId] });
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"] });

  if (listingQuery.isLoading) return <LoadingState description="Loading listing data for editing." title="Loading listing" />;
  if (listingQuery.error || countriesQuery.error) {
    return <ErrorState description="The listing editor could not be loaded." error={listingQuery.error ?? countriesQuery.error} title="Unable to edit listing" />;
  }

  const listing = listingQuery.data;
  if (!listing) return <EmptyState description="The listing is not available." title="Listing not found" />;

  const ownsListing = listing.ownerUserId === user?.id || (user?.companyId && listing.ownerCompanyId === user.companyId);
  if (!ownsListing) {
    return <EmptyState description="Only the listing owner can edit this vehicle marketplace listing." title="Edit unavailable" />;
  }

  const countries = countriesQuery.data?.length ? countriesQuery.data : [{ code: "MK", name: "North Macedonia" }, { code: "RS", name: "Serbia" }, { code: "BG", name: "Bulgaria" }];

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-primary" to={`/vehicle-marketplace/${listing.id}`}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to listing
      </Link>
      <PageHeader eyebrow="Vehicle marketplace" subtitle="Update owner-controlled listing details, status, pricing, and vehicle specs." title="Edit vehicle listing" />
      <EditVehicleMarketplaceListingForm countries={countries} listing={listing} />
    </div>
  );
}

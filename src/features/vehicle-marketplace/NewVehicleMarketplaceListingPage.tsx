import { useQuery } from "@tanstack/react-query";
import { CreditCard, ImageIcon, Save, X } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { uploadDocument } from "@/shared/api/modules/documents";
import { listSupportedCountries } from "@/shared/api/modules/geo";
import { createVehicleMarketplaceListing, type VehicleMarketplaceListingInput } from "@/shared/api/modules/vehicleMarketplace";
import { listVehicles } from "@/shared/api/modules/vehicles";
import { Button } from "@/shared/components/ui/Button";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Checkbox, Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { ErrorState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { fileToBase64 } from "@/shared/lib/files";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import type { MarketplaceImage } from "./vehicleMarketplaceMedia";

const vehicleTypes = ["TRUCK", "TRAILER", "VAN"] as const;
const bodyTypes = ["", "TILT", "BOX", "FLATBED", "REEFER", "TANKER"] as const;

export function NewVehicleMarketplaceListingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const initialVehicleId = searchParams.get("vehicleId") ?? "";
  const vehiclesQuery = useQuery({ queryFn: listVehicles, queryKey: ["vehicles", "marketplace-source"] });
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"] });
  const [form, setForm] = useState({
    bodyType: "",
    brand: "",
    capacityKg: "",
    city: "",
    countryCode: "MK",
    currency: "EUR",
    description: "",
    hazmatCertified: false,
    intent: "SALE",
    model: "",
    priceAmount: "",
    refrigerated: false,
    sourceType: initialVehicleId ? "FLEET_VEHICLE" : "STANDALONE",
    status: "PUBLISHED",
    title: "",
    vehicleId: initialVehicleId,
    vehicleType: "TRUCK",
    volumeM3: "",
    year: "",
  });
  const [images, setImages] = useState<MarketplaceImage[]>([]);
  const [uploadError, setUploadError] = useState<unknown>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  const selectedVehicle = useMemo(() => (vehiclesQuery.data ?? []).find((vehicle) => vehicle.id === form.vehicleId), [form.vehicleId, vehiclesQuery.data]);

  const mutation = useAppMutation({
    messages: { success: "Vehicle marketplace listing created" },
    mutationFn: createVehicleMarketplaceListing,
    onSuccess: (listing) => navigate(`/vehicle-marketplace/${listing.id}`),
  });

  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  const uploadImage = async (file: File) => {
    setUploadingImage(true);
    setUploadError(null);
    try {
      const document = await uploadDocument({
        contentBase64: await fileToBase64(file),
        fileName: file.name,
        kind: "OTHER",
        metadataJson: { purpose: "VEHICLE_MARKETPLACE_IMAGE" },
        mimeType: file.type || "application/octet-stream",
        name: file.name,
        ownerCompanyId: user?.companyId ?? undefined,
        ownerUserId: user?.companyId ? undefined : user?.id,
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
    const input: VehicleMarketplaceListingInput = {
      city: form.city.trim(),
      countryCode: form.countryCode.toUpperCase(),
      currency: form.currency.trim().toUpperCase() || undefined,
      description: form.description.trim() || undefined,
      hazmatCertified: form.hazmatCertified,
      intent: form.intent as VehicleMarketplaceListingInput["intent"],
      priceAmount: form.priceAmount || undefined,
      refrigerated: form.refrigerated,
      imageUrlsJson: images.length ? images : undefined,
      sourceType: form.sourceType as VehicleMarketplaceListingInput["sourceType"],
      status: form.status as VehicleMarketplaceListingInput["status"],
      title: form.title.trim(),
      vehicleType: (selectedVehicle?.vehicleType ?? form.vehicleType) as VehicleMarketplaceListingInput["vehicleType"],
      bodyType: form.bodyType ? (form.bodyType as VehicleMarketplaceListingInput["bodyType"]) : undefined,
      brand: form.brand.trim() || undefined,
      capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
      model: form.model.trim() || undefined,
      vehicleId: form.sourceType === "FLEET_VEHICLE" ? form.vehicleId : undefined,
      volumeM3: form.volumeM3 || undefined,
      year: form.year ? Number(form.year) : undefined,
    };
    mutation.mutate(input);
  };

  if (vehiclesQuery.error || countriesQuery.error) {
    return <ErrorState description="Catalog data for vehicle marketplace listing creation could not be loaded." error={vehiclesQuery.error ?? countriesQuery.error} title="Unable to prepare listing form" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Vehicle marketplace" subtitle="Publish a standalone listing or list one of your fleet vehicles." title="Create vehicle listing" />
      <Surface className="flex items-start gap-3 border-blue-100 bg-blue-50">
        <CreditCard className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <p className="text-sm font-semibold text-foreground">Drafts are free; published listings use quota first.</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            {user?.role === "JOB_SEEKER" ? "Job seeker vehicle listings cost 3 credits after the included monthly quota." : "Company vehicle listings cost 3 company credits after the included monthly quota."}
          </p>
        </div>
      </Surface>
      <Surface>
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
          <Field label="Source type" required>
            <Select onChange={(event) => update("sourceType", event.target.value)} value={form.sourceType}>
              <option value="STANDALONE">Standalone listing</option>
              <option value="FLEET_VEHICLE">Fleet vehicle</option>
            </Select>
          </Field>
          {form.sourceType === "FLEET_VEHICLE" ? (
            <Field label="Fleet vehicle" required>
              <Select onChange={(event) => update("vehicleId", event.target.value)} value={form.vehicleId}>
                <option value="">Select vehicle</option>
                {(vehiclesQuery.data ?? []).map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.plateNumber} - {[vehicle.brand, vehicle.model].filter(Boolean).join(" ") || humanizeEnum(vehicle.vehicleType)}
                  </option>
                ))}
              </Select>
            </Field>
          ) : (
            <Field label="Vehicle type" required>
              <Select onChange={(event) => update("vehicleType", event.target.value)} value={form.vehicleType}>
                {vehicleTypes.map((type) => <option key={type} value={type}>{humanizeEnum(type)}</option>)}
              </Select>
            </Field>
          )}
          <Field label="Title" required>
            <Input onChange={(event) => update("title", event.target.value)} placeholder="MAN TGX for rent" value={form.title} />
          </Field>
          <Field label="Intent" required>
            <Select onChange={(event) => update("intent", event.target.value)} value={form.intent}>
              <option value="SALE">Sale</option>
              <option value="RENTAL">Rental</option>
              <option value="LEASE">Lease</option>
            </Select>
          </Field>
          <Field label="Country" required>
            <Select onChange={(event) => update("countryCode", event.target.value)} value={form.countryCode}>
              {(countriesQuery.data?.length ? countriesQuery.data : [{ code: "MK", name: "North Macedonia" }, { code: "RS", name: "Serbia" }, { code: "BG", name: "Bulgaria" }]).map((country) => (
                <option key={country.code} value={country.code}>{country.code} - {country.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="City" required>
            <Input onChange={(event) => update("city", event.target.value)} placeholder="Skopje" value={form.city} />
          </Field>
          <Field label="Brand">
            <Input disabled={form.sourceType === "FLEET_VEHICLE"} onChange={(event) => update("brand", event.target.value)} placeholder={selectedVehicle?.brand ?? "MAN"} value={form.brand} />
          </Field>
          <Field label="Model">
            <Input disabled={form.sourceType === "FLEET_VEHICLE"} onChange={(event) => update("model", event.target.value)} placeholder={selectedVehicle?.model ?? "TGX"} value={form.model} />
          </Field>
          <Field label="Body type">
            <Select onChange={(event) => update("bodyType", event.target.value)} value={form.bodyType}>
              {bodyTypes.map((type) => <option key={type || "none"} value={type}>{type ? humanizeEnum(type) : "Not set"}</option>)}
            </Select>
          </Field>
          <Field label="Year">
            <Input inputMode="numeric" onChange={(event) => update("year", event.target.value)} placeholder="2023" value={form.year} />
          </Field>
          <Field label="Price amount">
            <Input inputMode="decimal" onChange={(event) => update("priceAmount", event.target.value)} placeholder="18000" value={form.priceAmount} />
          </Field>
          <Field label="Currency">
            <Input maxLength={3} onChange={(event) => update("currency", event.target.value.toUpperCase())} value={form.currency} />
          </Field>
          <Field label="Capacity kg">
            <Input inputMode="numeric" onChange={(event) => update("capacityKg", event.target.value)} placeholder="12000" value={form.capacityKg} />
          </Field>
          <Field label="Volume m3">
            <Input inputMode="decimal" onChange={(event) => update("volumeM3", event.target.value)} placeholder="45.5" value={form.volumeM3} />
          </Field>
          <div className="rounded-lg bg-surface-pearl p-4 lg:col-span-2">
            <div className="flex flex-wrap gap-5">
              <Checkbox checked={form.refrigerated} onChange={(event) => update("refrigerated", event.target.checked)}>Refrigerated</Checkbox>
              <Checkbox checked={form.hazmatCertified} onChange={(event) => update("hazmatCertified", event.target.checked)}>Hazmat certified</Checkbox>
            </div>
          </div>
          <Field label="Description">
            <Textarea onChange={(event) => update("description", event.target.value)} placeholder="Availability, documents, condition, and usage notes." value={form.description} />
          </Field>
          <Field label="Publish state">
            <Select onChange={(event) => update("status", event.target.value)} value={form.status}>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
            </Select>
          </Field>
          <div className="space-y-3 lg:col-span-2">
            <div>
              <h2 className="text-base font-semibold">Vehicle photos</h2>
              <p className="mt-1 text-sm text-muted">Upload multiple photos. The first image becomes the marketplace cover.</p>
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
          <div className="lg:col-span-2">
            <Button disabled={mutation.isPending} type="submit">
              <Save className="size-4" aria-hidden="true" />
              Create listing
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}

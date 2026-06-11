import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CreditCard, FileText, Plus, Save, Trash2, Truck, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { uploadDocument } from "@/shared/api/modules/documents";
import { listMyJobApplications } from "@/shared/api/modules/jobApplications";
import { getJobSeekerWallet } from "@/shared/api/modules/jobSeekerBilling";
import { createLicense, listLicenses, listLicenseTypes, type LicenseRecord } from "@/shared/api/modules/licenses";
import { getMe, getMyProfileCompletion, updateMyUser, type UserProfile } from "@/shared/api/modules/users";
import { listMyVehicleMarketplaceListings } from "@/shared/api/modules/vehicleMarketplace";
import { createVehicle, deleteVehicle, listVehicles, type VehicleRecord, type VehicleType } from "@/shared/api/modules/vehicles";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { fileToBase64 } from "@/shared/lib/files";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";

type ProfileForm = {
  availability: string;
  city: string;
  countryCode: string;
  firstName: string;
  headline: string;
  imageUrl: string;
  lastName: string;
  phone: string;
  preferredRoutesText: string;
  yearsExperience: string;
};

type LicenseForm = {
  documentUrl: string;
  expiresAt: string;
  imageUrl: string;
  issuedAt: string;
  licenseType: string;
};

type VehicleSelfServiceForm = {
  brand: string;
  capacityKg: string;
  countryOfRegistration: string;
  documentsJson: string;
  hazmatCertified: boolean;
  imageUrl: string;
  model: string;
  plateNumber: string;
  refrigerated: boolean;
  vehicleType: VehicleType;
  volumeM3: string;
  year: string;
};

const missingLabels: Record<string, string> = {
  availability: "Set when you are available for work.",
  city: "Add your current city.",
  countryCode: "Add your country.",
  emailVerified: "Verify your email address.",
  firstName: "Add your first name.",
  headline: "Add a short driver headline.",
  lastName: "Add your last name.",
  phone: "Add a phone number so companies can reach you.",
  preferredRoutes: "Add preferred routes or regions.",
  yearsExperience: "Add years of driving experience.",
};

function toForm(profile?: UserProfile | null): ProfileForm {
  return {
    availability: profile?.availability ?? "",
    city: profile?.city ?? "",
    countryCode: profile?.countryCode ?? "",
    firstName: profile?.firstName ?? "",
    headline: profile?.headline ?? "",
    imageUrl: profile?.imageUrl ?? "",
    lastName: profile?.lastName ?? "",
    phone: profile?.phone ?? "",
    preferredRoutesText: Array.isArray(profile?.preferredRoutes) ? profile.preferredRoutes.join(", ") : "",
    yearsExperience: profile?.yearsExperience === null || profile?.yearsExperience === undefined ? "" : String(profile.yearsExperience),
  };
}

function preferredRoutesFromText(value: string) {
  const routes = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return routes.length ? routes : null;
}

function nextStepCopy(nextBestAction?: string | null) {
  if (!nextBestAction) return "Your job seeker profile is ready for marketplace activity.";
  return missingLabels[nextBestAction] ?? `Complete ${humanizeEnum(nextBestAction)}.`;
}

function StatCard({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <Surface>
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-sm text-muted">{label}</p>
    </Surface>
  );
}

function ProfileEditor({ profile }: { profile: UserProfile }) {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const [form, setForm] = useState<ProfileForm>(() => toForm(profile));
  const profileImageUpload = useAppMutation({
    messages: { success: "Profile image uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "OTHER",
      metadataJson: { purpose: "JOB_SEEKER_PROFILE_IMAGE", userId: profile.id },
      mimeType: file.type || "image/png",
      name: `${profile.firstName} ${profile.lastName} profile image`.trim(),
      ownerUserId: profile.id,
    }),
    onSuccess: (document) => {
      if (document.url) update("imageUrl", document.url);
    },
  });
  const mutation = useAppMutation({
    messages: { success: "Job profile updated" },
    mutationFn: updateMyUser,
    onSuccess: (updatedProfile) => {
      setUser(updatedProfile);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["users", "me", "profile-completion"] });
    },
  });
  const update = (key: keyof ProfileForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate({
      availability: form.availability.trim() || null,
      city: form.city.trim() || null,
      countryCode: form.countryCode.trim() ? form.countryCode.trim().toUpperCase() : null,
      firstName: form.firstName.trim(),
      headline: form.headline.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      lastName: form.lastName.trim(),
      phone: form.phone.trim() || null,
      preferredRoutes: preferredRoutesFromText(form.preferredRoutesText),
      yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : null,
    });
  };

  return (
    <Surface>
      <form className="grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <div className="md:col-span-2">
          <div className="grid gap-4 rounded-xl border border-border bg-surface-pearl p-4 md:grid-cols-[auto_1fr] md:items-center">
            {form.imageUrl ? (
              <img alt="Job seeker profile" className="size-20 rounded-xl border border-border object-cover" src={form.imageUrl} />
            ) : (
              <div className="grid size-20 place-items-center rounded-xl border border-border bg-card text-muted">
                <UserRound className="size-7" aria-hidden="true" />
              </div>
            )}
            <Field label="Profile image" description="Upload a JPG, PNG, or WebP image. Save the profile after upload.">
              <FileUploadControl
                accept="image/jpeg,image/png,image/webp"
                disabled={profileImageUpload.isPending}
                error={profileImageUpload.error}
                isUploading={profileImageUpload.isPending}
                onFileSelect={(file) => profileImageUpload.mutate(file)}
                previewAlt="Profile image preview"
                previewUrl={form.imageUrl}
                value={form.imageUrl}
              />
            </Field>
          </div>
        </div>
        <Field label="First name" required><Input onChange={(event) => update("firstName", event.target.value)} value={form.firstName} /></Field>
        <Field label="Last name" required><Input onChange={(event) => update("lastName", event.target.value)} value={form.lastName} /></Field>
        <Field label="Phone"><Input onChange={(event) => update("phone", event.target.value)} placeholder="+389..." value={form.phone} /></Field>
        <Field label="Country"><Input maxLength={2} onChange={(event) => update("countryCode", event.target.value.toUpperCase())} placeholder="MK" value={form.countryCode} /></Field>
        <Field label="City"><Input onChange={(event) => update("city", event.target.value)} placeholder="Prilep" value={form.city} /></Field>
        <Field label="Headline"><Input onChange={(event) => update("headline", event.target.value)} placeholder="ADR driver available for Balkan routes" value={form.headline} /></Field>
        <Field label="Years experience"><Input inputMode="numeric" onChange={(event) => update("yearsExperience", event.target.value)} placeholder="5" value={form.yearsExperience} /></Field>
        <Field label="Availability"><Input onChange={(event) => update("availability", event.target.value)} placeholder="Available from July" value={form.availability} /></Field>
        <Field label="Preferred routes" description="Separate routes with commas.">
          <Input onChange={(event) => update("preferredRoutesText", event.target.value)} placeholder="MK-BG, MK-RS" value={form.preferredRoutesText} />
        </Field>
        <div className="md:col-span-2">
          <Button disabled={mutation.isPending || !form.firstName.trim() || !form.lastName.trim()} type="submit">
            <Save className="size-4" aria-hidden="true" />
            Save profile
          </Button>
        </div>
      </form>
    </Surface>
  );
}

function LicenseSelfService({ licenses, userId }: { licenses: LicenseRecord[]; userId: string }) {
  const queryClient = useQueryClient();
  const licenseTypesQuery = useQuery({ queryFn: listLicenseTypes, queryKey: ["licenses", "types"], staleTime: 1000 * 60 * 30 });
  const [form, setForm] = useState<LicenseForm>({ documentUrl: "", expiresAt: "", imageUrl: "", issuedAt: "", licenseType: "" });
  const update = (key: keyof LicenseForm, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const refreshLicenses = () => queryClient.invalidateQueries({ queryKey: ["licenses", "me", userId] });
  const createMutation = useAppMutation({
    messages: { success: "License added" },
    mutationFn: createLicense,
    onSuccess: () => {
      setForm({ documentUrl: "", expiresAt: "", imageUrl: "", issuedAt: "", licenseType: "" });
      void refreshLicenses();
      void queryClient.invalidateQueries({ queryKey: ["users", "me", "profile-completion"] });
    },
  });
  const photoUpload = useAppMutation({
    messages: { success: "License photo uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "OTHER",
      metadataJson: { purpose: "JOB_SEEKER_LICENSE_PHOTO", userId, licenseType: form.licenseType },
      mimeType: file.type || "image/png",
      name: `License photo ${form.licenseType || "credential"}`,
      ownerUserId: userId,
    }),
    onSuccess: (document) => {
      if (document.url) update("imageUrl", document.url);
    },
  });
  const documentUpload = useAppMutation({
    messages: { success: "License document uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "OTHER",
      metadataJson: { purpose: "JOB_SEEKER_LICENSE_DOCUMENT", userId, licenseType: form.licenseType },
      mimeType: file.type || "application/pdf",
      name: `License document ${form.licenseType || "credential"}`,
      ownerUserId: userId,
    }),
    onSuccess: (document) => {
      if (document.url) update("documentUrl", document.url);
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      documentUrl: form.documentUrl || undefined,
      expiresAt: form.expiresAt || undefined,
      imageUrl: form.imageUrl || undefined,
      isValid: true,
      issuedAt: form.issuedAt || undefined,
      licenseType: form.licenseType,
    });
  };

  return (
    <Surface>
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Licenses and credentials</h2>
          <p className="mt-1 text-sm text-muted">Attach license photos or documents directly to your independent driver profile.</p>
        </div>
        <StatusBadge tone={licenses.length ? "success" : "warning"}>{licenses.length ? `${licenses.length} active` : "Missing"}</StatusBadge>
      </div>

      <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <Field label="License type" required>
          <Select aria-label="License type" disabled={licenseTypesQuery.isLoading} onChange={(event) => update("licenseType", event.target.value)} value={form.licenseType}>
            <option value="">Select license type</option>
            {(licenseTypesQuery.data ?? []).map((type) => <option key={type.code} value={type.code}>{type.label}</option>)}
          </Select>
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Issued date"><Input aria-label="Issued date" onChange={(event) => update("issuedAt", event.target.value)} type="date" value={form.issuedAt} /></Field>
          <Field label="Expiry date"><Input aria-label="Expiry date" onChange={(event) => update("expiresAt", event.target.value)} type="date" value={form.expiresAt} /></Field>
        </div>
        <Field label="License photo">
          <FileUploadControl
            accept="image/jpeg,image/png,image/webp"
            disabled={photoUpload.isPending}
            error={photoUpload.error}
            isUploading={photoUpload.isPending}
            onFileSelect={(file) => photoUpload.mutate(file)}
            previewAlt="License photo preview"
            previewUrl={form.imageUrl}
            value={form.imageUrl}
          />
        </Field>
        <Field label="License document">
          <FileUploadControl
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={documentUpload.isPending}
            error={documentUpload.error}
            isUploading={documentUpload.isPending}
            onFileSelect={(file) => documentUpload.mutate(file)}
            value={form.documentUrl}
          />
        </Field>
        <div className="md:col-span-2">
          <Button disabled={createMutation.isPending || !form.licenseType} type="submit">
            <Plus className="size-4" aria-hidden="true" />
            Add license
          </Button>
        </div>
      </form>

      <div className="mt-5 space-y-2">
        {licenses.length === 0 ? (
          <p className="rounded-lg bg-surface-pearl px-3 py-3 text-sm text-muted">No license records yet. Add at least one credential before applying to serious transport work.</p>
        ) : licenses.slice(0, 5).map((license) => (
          <div className="grid gap-3 rounded-lg bg-surface-pearl px-3 py-3 sm:grid-cols-[1fr_auto] sm:items-center" key={license.id}>
            <div>
              <p className="text-sm font-semibold">{license.licenseType}</p>
              <p className="text-xs text-muted">{license.expiresAt ? `Expires ${license.expiresAt.slice(0, 10)}` : "No expiry date"}{license.documentUrl ? " - document attached" : ""}</p>
            </div>
            <StatusBadge tone={license.isValid ? "success" : "warning"}>{license.isValid ? "Valid" : "Review"}</StatusBadge>
          </div>
        ))}
      </div>
    </Surface>
  );
}

const vehicleDefaults: VehicleSelfServiceForm = {
  brand: "",
  capacityKg: "",
  countryOfRegistration: "MK",
  documentsJson: "",
  hazmatCertified: false,
  imageUrl: "",
  model: "",
  plateNumber: "",
  refrigerated: false,
  vehicleType: "TRUCK",
  volumeM3: "",
  year: "",
};

function VehicleSelfService({ userId, vehicles }: { userId: string; vehicles: VehicleRecord[] }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<VehicleSelfServiceForm>(vehicleDefaults);
  const update = (key: keyof VehicleSelfServiceForm, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));
  const refreshVehicles = () => queryClient.invalidateQueries({ queryKey: ["vehicles", "me", userId] });
  const createMutation = useAppMutation({
    messages: { success: "Vehicle saved" },
    mutationFn: createVehicle,
    onSuccess: () => {
      setForm(vehicleDefaults);
      void refreshVehicles();
      void queryClient.invalidateQueries({ queryKey: ["users", "me", "profile-completion"] });
    },
  });
  const deleteMutation = useAppMutation({
    messages: { success: "Vehicle deleted" },
    mutationFn: deleteVehicle,
    onSuccess: () => {
      void refreshVehicles();
    },
  });
  const imageUpload = useAppMutation({
    messages: { success: "Vehicle image uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "OTHER",
      metadataJson: { purpose: "JOB_SEEKER_VEHICLE_IMAGE", userId },
      mimeType: file.type || "image/png",
      name: `Vehicle image ${form.plateNumber || "owned vehicle"}`,
      ownerUserId: userId,
    }),
    onSuccess: (document) => {
      if (document.url) update("imageUrl", document.url);
    },
  });
  const documentUpload = useAppMutation({
    messages: { success: "Vehicle document uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: file.type === "application/pdf" ? "VEHICLE_REGISTRATION" : "OTHER",
      metadataJson: { purpose: "JOB_SEEKER_VEHICLE_DOCUMENT", userId },
      mimeType: file.type || "application/pdf",
      name: `Vehicle document ${form.plateNumber || "owned vehicle"}`,
      ownerUserId: userId,
    }),
    onSuccess: (document) => {
      if (!document.url) return;
      update("documentsJson", [form.documentsJson, document.url].filter(Boolean).join("\n"));
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    createMutation.mutate({
      brand: form.brand.trim() || undefined,
      capacityKg: form.capacityKg ? Number(form.capacityKg) : undefined,
      countryOfRegistration: form.countryOfRegistration.trim().toUpperCase(),
      documentsJson: form.documentsJson.trim() || undefined,
      hazmatCertified: form.hazmatCertified,
      imageUrl: form.imageUrl.trim() || undefined,
      isActive: true,
      model: form.model.trim() || undefined,
      plateNumber: form.plateNumber.trim(),
      refrigerated: form.refrigerated,
      vehicleType: form.vehicleType,
      volumeM3: form.volumeM3 || undefined,
      year: form.year ? Number(form.year) : undefined,
    });
  };

  return (
    <Surface>
      <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">My vehicles</h2>
          <p className="mt-1 text-sm text-muted">Save your real vehicle once, then publish it into the vehicle marketplace when needed.</p>
        </div>
        <StatusBadge tone={vehicles.length ? "success" : "warning"}>{vehicles.length ? `${vehicles.length} saved` : "Missing"}</StatusBadge>
      </div>

      <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submit}>
        <Field label="Vehicle type" required>
          <Select onChange={(event) => update("vehicleType", event.target.value)} value={form.vehicleType}>
            <option value="TRUCK">Truck</option>
            <option value="TRAILER">Trailer</option>
            <option value="VAN">Van</option>
          </Select>
        </Field>
        <Field label="Plate number" required><Input onChange={(event) => update("plateNumber", event.target.value)} placeholder="PP-123-AB" value={form.plateNumber} /></Field>
        <Field label="Registration country" required><Input maxLength={2} onChange={(event) => update("countryOfRegistration", event.target.value.toUpperCase())} placeholder="MK" value={form.countryOfRegistration} /></Field>
        <Field label="Brand"><Input onChange={(event) => update("brand", event.target.value)} placeholder="MAN" value={form.brand} /></Field>
        <Field label="Model"><Input onChange={(event) => update("model", event.target.value)} placeholder="TGX" value={form.model} /></Field>
        <Field label="Year"><Input inputMode="numeric" onChange={(event) => update("year", event.target.value)} placeholder="2022" value={form.year} /></Field>
        <Field label="Capacity kg"><Input inputMode="numeric" onChange={(event) => update("capacityKg", event.target.value)} placeholder="12000" value={form.capacityKg} /></Field>
        <Field label="Volume m3"><Input inputMode="decimal" onChange={(event) => update("volumeM3", event.target.value)} placeholder="45" value={form.volumeM3} /></Field>
        <Field label="Vehicle image">
          <FileUploadControl
            accept="image/jpeg,image/png,image/webp"
            disabled={imageUpload.isPending}
            error={imageUpload.error}
            isUploading={imageUpload.isPending}
            onFileSelect={(file) => imageUpload.mutate(file)}
            previewAlt="Owned vehicle preview"
            previewUrl={form.imageUrl}
            value={form.imageUrl}
          />
        </Field>
        <Field label="Vehicle documents">
          <FileUploadControl
            accept="application/pdf,image/jpeg,image/png,image/webp"
            disabled={documentUpload.isPending}
            error={documentUpload.error}
            isUploading={documentUpload.isPending}
            onFileSelect={(file) => documentUpload.mutate(file)}
            value={form.documentsJson}
          />
        </Field>
        <div className="flex flex-wrap gap-3 rounded-lg bg-surface-pearl p-4 md:col-span-2">
          <label className="inline-flex items-center gap-2 text-sm font-semibold"><input checked={form.refrigerated} onChange={(event) => update("refrigerated", event.target.checked)} type="checkbox" /> Refrigerated</label>
          <label className="inline-flex items-center gap-2 text-sm font-semibold"><input checked={form.hazmatCertified} onChange={(event) => update("hazmatCertified", event.target.checked)} type="checkbox" /> Hazmat certified</label>
        </div>
        <div className="md:col-span-2">
          <Button disabled={createMutation.isPending || !form.plateNumber.trim()} type="submit">
            <Plus className="size-4" aria-hidden="true" />
            Add vehicle
          </Button>
        </div>
      </form>

      <div className="mt-5 grid gap-3">
        {vehicles.length === 0 ? (
          <p className="rounded-lg bg-surface-pearl px-3 py-3 text-sm text-muted">No owned vehicles yet. Add a truck, trailer, or van before creating reusable vehicle marketplace ads.</p>
        ) : vehicles.map((vehicle) => (
          <div className="grid gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-[auto_1fr_auto] sm:items-center" key={vehicle.id}>
            {vehicle.imageUrl ? <img alt={vehicle.plateNumber} className="size-16 rounded-lg object-cover" src={vehicle.imageUrl} /> : <div className="grid size-16 place-items-center rounded-lg bg-surface-pearl text-muted"><Truck className="size-6" /></div>}
            <div>
              <p className="text-sm font-semibold">{vehicle.plateNumber} - {vehicle.countryOfRegistration}</p>
              <p className="mt-1 text-xs text-muted">{[humanizeEnum(vehicle.vehicleType), vehicle.brand, vehicle.model, vehicle.year].filter(Boolean).join(" / ")}</p>
              <p className="mt-1 text-xs text-muted">{[vehicle.capacityKg ? `${vehicle.capacityKg} kg` : null, vehicle.refrigerated ? "Refrigerated" : null, vehicle.hazmatCertified ? "Hazmat" : null].filter(Boolean).join(" - ") || "No capabilities set"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground" to={`/vehicle-marketplace/new?vehicleId=${vehicle.id}`}>Publish ad</Link>
              <Button className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => window.confirm("Delete this owned vehicle? Existing marketplace listings keep their copied details.") && deleteMutation.mutate(vehicle.id)} type="button" variant="danger">
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </Surface>
  );
}

export function JobProfilePage() {
  const authUser = useAuthStore((state) => state.user);
  const profileQuery = useQuery({ enabled: authUser?.role === "JOB_SEEKER", queryFn: getMe, queryKey: ["users", "me"] });
  const completionQuery = useQuery({ enabled: authUser?.role === "JOB_SEEKER", queryFn: getMyProfileCompletion, queryKey: ["users", "me", "profile-completion"] });
  const walletQuery = useQuery({ enabled: authUser?.role === "JOB_SEEKER", queryFn: getJobSeekerWallet, queryKey: ["job-seeker-billing", "wallet"] });
  const licensesQuery = useQuery({ enabled: Boolean(authUser?.id) && authUser?.role === "JOB_SEEKER", queryFn: () => listLicenses({ userId: authUser?.id }), queryKey: ["licenses", "me", authUser?.id] });
  const jobsQuery = useQuery({ enabled: authUser?.role === "JOB_SEEKER", queryFn: listMyJobApplications, queryKey: ["job-applications", "mine"] });
  const vehicleListingsQuery = useQuery({ enabled: authUser?.role === "JOB_SEEKER", queryFn: () => listMyVehicleMarketplaceListings({ includeDeleted: true }), queryKey: ["vehicle-marketplace", "mine", "job-profile"] });
  const ownedVehiclesQuery = useQuery({ enabled: authUser?.role === "JOB_SEEKER", queryFn: listVehicles, queryKey: ["vehicles", "me", authUser?.id] });

  const error = profileQuery.error ?? completionQuery.error ?? walletQuery.error ?? licensesQuery.error ?? jobsQuery.error ?? vehicleListingsQuery.error ?? ownedVehiclesQuery.error;
  const isLoading = profileQuery.isLoading || completionQuery.isLoading || walletQuery.isLoading || licensesQuery.isLoading || jobsQuery.isLoading || vehicleListingsQuery.isLoading || ownedVehiclesQuery.isLoading;
  const completion = completionQuery.data;
  const licenses = licensesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const vehicleListings = useMemo(() => vehicleListingsQuery.data ?? [], [vehicleListingsQuery.data]);
  const ownedVehicles = ownedVehiclesQuery.data ?? [];
  const activeVehicleListings = useMemo(() => vehicleListings.filter((listing) => !listing.deletedAt).length, [vehicleListings]);
  const publishedVehicleListings = useMemo(() => vehicleListings.filter((listing) => listing.status === "PUBLISHED" && !listing.deletedAt).length, [vehicleListings]);
  const draftVehicleListings = useMemo(() => vehicleListings.filter((listing) => listing.status === "DRAFT" && !listing.deletedAt).length, [vehicleListings]);

  if (authUser?.role !== "JOB_SEEKER") {
    return <ErrorState description="Job profiles are available to independent job seekers only." title="Job seeker profile" />;
  }
  if (isLoading) return <LoadingState description="Loading your independent driver profile, wallet, licenses, and marketplace activity." title="Loading job profile" />;
  if (error) return <ErrorState description="Your job seeker profile could not be loaded." error={error} title="Unable to load job profile" />;

  return (
    <div className="space-y-6">
      <PageHeader
        action={<Link className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" to="/job-wallet">Open wallet</Link>}
        eyebrow="Independent driver workspace"
        subtitle="Keep your profile, licenses, listings, vehicle posts, and credits ready for marketplace actions."
        title="Job profile"
      />

      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard icon={UserRound} label="Profile completion" value={`${completion?.percent ?? 0}%`} />
        <StatCard icon={CreditCard} label="Wallet balance" value={`${walletQuery.data?.balanceCredits ?? 0} credits`} />
        <StatCard icon={FileText} label="License records" value={`${licenses.length}`} />
        <StatCard icon={Truck} label="Active vehicle listings" value={`${activeVehicleListings}`} />
      </section>

      <Surface className="border-blue-100 bg-blue-50">
        <p className="text-sm font-semibold text-foreground">Next best step</p>
        <p className="mt-1 text-sm leading-6 text-muted">{nextStepCopy(completion?.nextBestAction)}</p>
        {completion?.missingItems?.length ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {completion.missingItems.slice(0, 6).map((item) => <StatusBadge key={item} tone="warning">{humanizeEnum(item)}</StatusBadge>)}
          </div>
        ) : null}
      </Surface>

      <div className="grid gap-5 xl:grid-cols-[0.58fr_0.42fr]">
        <ProfileEditor profile={profileQuery.data as UserProfile} />

        <div className="space-y-5">
          <Surface>
            <h2 className="text-xl font-semibold">Marketplace shortcuts</h2>
            <div className="mt-4 space-y-3 text-sm">
              <Link className="flex items-center justify-between rounded-lg bg-primary px-3 py-2 font-semibold text-primary-foreground" to="/vehicle-marketplace/new">
                <span><Truck className="mr-2 inline size-4" aria-hidden="true" />Add vehicle listing</span>
                <Plus className="size-4" aria-hidden="true" />
              </Link>
              <Link className="flex items-center justify-between rounded-lg bg-card px-3 py-2 font-semibold text-primary ring-1 ring-border" to="/jobs/new">
                <span><BriefcaseBusiness className="mr-2 inline size-4" aria-hidden="true" />Create job listing</span>
                <Plus className="size-4" aria-hidden="true" />
              </Link>
              <Link className="flex items-center justify-between rounded-lg bg-surface-pearl px-3 py-2 font-semibold text-primary" to="/jobs/mine">
                <span><BriefcaseBusiness className="mr-2 inline size-4" aria-hidden="true" />Job listings</span>
                <span>{jobs.length}</span>
              </Link>
              <Link className="flex items-center justify-between rounded-lg bg-surface-pearl px-3 py-2 font-semibold text-primary" to="/vehicle-marketplace/mine">
                <span><Truck className="mr-2 inline size-4" aria-hidden="true" />Vehicle listings</span>
                <span>{vehicleListings.length}</span>
              </Link>
            </div>
          </Surface>
          <Surface>
            <h2 className="text-xl font-semibold">Vehicle listing status</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-surface-pearl p-3"><p className="text-lg font-semibold">{publishedVehicleListings}</p><p className="text-xs text-muted">Published</p></div>
              <div className="rounded-lg bg-surface-pearl p-3"><p className="text-lg font-semibold">{draftVehicleListings}</p><p className="text-xs text-muted">Drafts</p></div>
              <div className="rounded-lg bg-surface-pearl p-3"><p className="text-lg font-semibold">{vehicleListings.filter((listing) => listing.deletedAt).length}</p><p className="text-xs text-muted">Deleted</p></div>
            </div>
          </Surface>
        </div>
      </div>

      <VehicleSelfService userId={authUser.id} vehicles={ownedVehicles} />
      <LicenseSelfService licenses={licenses} userId={authUser.id} />
    </div>
  );
}

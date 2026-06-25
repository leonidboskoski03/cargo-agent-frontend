import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, RotateCcw, ShieldCheck, Trash2 } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { deleteMyCompany, getMyCompany, requestMyCompanyVerification, restoreCompany, updateMyCompany } from "@/shared/api/modules/companies";
import { uploadDocument } from "@/shared/api/modules/documents";
import { listSupportedCountries } from "@/shared/api/modules/geo";
import { getMyProfileCompletion } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { fileToBase64 } from "@/shared/lib/files";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageCompany } from "@/features/team/teamPermissions";
import { companySchema, type CompanyFormInput, type CompanyFormValues } from "./companySchemas";

function completionCopy(nextBestAction?: string | null) {
  const labels: Record<string, string> = {
    companyAddress: "Add the company street address.",
    companyCity: "Add the company city.",
    companyCountryCode: "Select the company country.",
    companyEmail: "Add a shared company email.",
    companyPhone: "Add a company phone number.",
    companyWebsite: "Add the company website.",
    emailVerified: "Verify your account email.",
    firstName: "Add your first name.",
    lastName: "Add your last name.",
    phone: "Add your personal phone number.",
    registrationNumber: "Add the company registration number.",
  };
  return nextBestAction ? labels[nextBestAction] ?? "Complete the next missing profile field." : "Company and profile basics are complete.";
}

function verificationTone(status: string): "danger" | "neutral" | "success" | "warning" {
  if (status === "VERIFIED") return "success";
  if (status === "FAILED") return "danger";
  if (status === "PENDING" || status === "NEEDS_REVIEW") return "warning";
  return "neutral";
}

export function CompanyPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isAdmin = canManageCompany(user?.role);
  const companyQuery = useQuery({ queryFn: () => getMyCompany(), queryKey: ["companies", "me"] });
  const company = companyQuery.data;
  const isDeletedCompany = Boolean(company?.deletedAt);
  const completionQuery = useQuery({ enabled: !isDeletedCompany, queryFn: () => getMyProfileCompletion(), queryKey: ["users", "me", "profile-completion"] });
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"], staleTime: 1000 * 60 * 30 });

  const form = useForm<CompanyFormInput, unknown, CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      address: "",
      bio: "",
      city: "",
      companyType: "BOTH",
      countryCode: "",
      email: "",
      employeeCount: "",
      logoUrl: "",
      name: "",
      phone: "",
      registrationNumber: "",
      vatNumber: "",
      website: "",
    },
    values: {
      address: company?.address ?? "",
      bio: company?.bio ?? "",
      city: company?.city ?? "",
      companyType: company?.companyType ?? "BOTH",
      countryCode: company?.countryCode ?? "",
      email: company?.email ?? "",
      employeeCount: company?.employeeCount ? String(company.employeeCount) : "",
      logoUrl: company?.logoUrl ?? "",
      name: company?.name ?? "",
      phone: company?.phone ?? "",
      registrationNumber: company?.registrationNumber ?? "",
      vatNumber: company?.vatNumber ?? "",
      website: company?.website ?? "",
    },
  });
  const logoValue = useWatch({ control: form.control, name: "logoUrl" });

  const logoUploadMutation = useAppMutation({
    messages: { success: "Logo uploaded" },
    mutationFn: async (file: File) => uploadDocument({
      contentBase64: await fileToBase64(file),
      fileName: file.name,
      kind: "OTHER",
      metadataJson: { purpose: "COMPANY_LOGO" },
      mimeType: file.type || "image/png",
      name: `${company?.name ?? "Company"} logo`,
    }),
    onSuccess: (document) => {
      if (document.url) form.setValue("logoUrl", document.url, { shouldDirty: true, shouldValidate: true });
    },
  });

  const handleLogoFile = (file?: File) => {
    if (file) logoUploadMutation.mutate(file);
  };

  const updateMutation = useAppMutation({
    messages: { success: "Company profile updated" },
    mutationFn: updateMyCompany,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["companies", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["users", "me", "profile-completion"] });
    },
  });

  const restoreMutation = useAppMutation({
    messages: { success: "Company restored" },
    mutationFn: restoreCompany,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["companies", "me"] }),
  });

  const deleteMutation = useAppMutation({
    mutationFn: deleteMyCompany,
    onSuccess: (deletedCompany) => {
      void queryClient.invalidateQueries({ queryKey: ["companies", "me"] });
      toast.success("Company deleted", {
        action: {
          label: "Undo",
          onClick: () => restoreMutation.mutate(deletedCompany.id),
        },
      });
    },
  });
  const verificationMutation = useAppMutation({
    messages: { success: "Verification requested" },
    mutationFn: requestMyCompanyVerification,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["companies", "me"] }),
  });

  if (companyQuery.isLoading) {
    return <LoadingState description="Loading your company profile and completion score." title="Loading company" />;
  }

  if (companyQuery.error) {
    return <ErrorState description="The company profile could not be loaded." error={companyQuery.error} title="Unable to load company" />;
  }

  if (!company) {
    return <EmptyState description="Your account is not linked to an active company workspace." title="Company not found" />;
  }

  const completion = completionQuery.data;
  const verificationStatus = company.verificationStatus ?? "UNVERIFIED";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Company control center"
        subtitle="Keep the tenant identity clear for admins, drivers, marketplace partners, and future billing flows."
        title={company.name}
      />

      <div className="grid gap-5 lg:grid-cols-[0.38fr_0.62fr]">
        <div className="space-y-5">
          <Surface>
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
                <Building2 aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-[-0.28px]">{company.name}</h2>
                <p className="text-sm text-muted">{company.city}, {company.countryCode}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-4">
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Status</dt>
                <dd className="mt-1"><StatusBadge tone={isDeletedCompany ? "danger" : "success"}>{isDeletedCompany ? "DELETED" : "ACTIVE"}</StatusBadge></dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Type</dt>
                <dd className="mt-1 text-sm">{company.companyType}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Registration</dt>
                <dd className="mt-1 break-words text-sm">{company.registrationNumber}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Verification</dt>
                <dd className="mt-1 space-y-2">
                  <StatusBadge tone={verificationTone(verificationStatus)}>{verificationStatus.replaceAll("_", " ")}</StatusBadge>
                  {company.verificationProvider ? (
                    <p className="text-xs leading-5 text-muted">
                      {company.verificationProvider}
                      {company.verificationCheckedAt ? ` · ${new Date(company.verificationCheckedAt).toLocaleDateString()}` : ""}
                    </p>
                  ) : null}
                  {company.verificationFailureReason ? (
                    <p className="text-xs leading-5 text-muted">{company.verificationFailureReason}</p>
                  ) : null}
                  {isAdmin ? (
                    <Button
                      className="min-h-8 px-3 py-1.5 text-xs"
                      disabled={verificationMutation.isPending || verificationStatus === "PENDING"}
                      onClick={() => verificationMutation.mutate()}
                      type="button"
                      variant="secondary"
                    >
                      <ShieldCheck aria-hidden="true" className="size-4" />
                      Run verification
                    </Button>
                  ) : null}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase text-muted">Subscription</dt>
                <dd className="mt-1 text-sm">{company.subscriptionStatus ?? "Pending"}</dd>
              </div>
            </dl>
          </Surface>

          <Surface>
            <h2 className="text-xl font-semibold tracking-[-0.28px]">Profile completion</h2>
            <p className="mt-2 text-4xl font-semibold tracking-[-0.28px]">{completion?.percent ?? 0}%</p>
            <p className="mt-2 text-sm leading-6 text-muted">{completionCopy(completion?.nextBestAction)}</p>
          </Surface>
        </div>

        <Surface>
          {isDeletedCompany ? (
            <div className="space-y-4">
              <EmptyState
                description="This company workspace is currently deleted. Restore it before editing profile details or managing operational records."
                title="Company deleted"
              />
              {isAdmin ? (
                <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(company.id)} type="button" variant="secondary">
                  <RotateCcw aria-hidden="true" className="size-4" />
                  Restore Company
                </Button>
              ) : null}
            </div>
          ) : isAdmin ? (
            <form className="grid gap-4 md:grid-cols-2" onSubmit={form.handleSubmit((values) => updateMutation.mutate(values))}>
              <div className="md:col-span-2">
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">Edit company profile</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Drivers can view this profile. Only admins can update the workspace identity.</p>
              </div>
              <Field error={form.formState.errors.name} label="Company name" required>
                <Input {...form.register("name")} autoComplete="organization" />
              </Field>
              <Field error={form.formState.errors.companyType} label="Company type" required>
                <Select {...form.register("companyType")}>
                  <option value="SHIPPER">Shipper</option>
                  <option value="CARRIER">Carrier</option>
                  <option value="BOTH">Both</option>
                </Select>
              </Field>
              <Field error={form.formState.errors.registrationNumber} label="Registration number" required>
                <Input {...form.register("registrationNumber")} autoComplete="off" />
              </Field>
              <Field error={form.formState.errors.vatNumber} label="VAT number">
                <Input {...form.register("vatNumber")} autoComplete="off" />
              </Field>
              <Field error={form.formState.errors.city} label="City" required>
                <Input {...form.register("city")} autoComplete="address-level2" />
              </Field>
              <Field error={form.formState.errors.countryCode} label="Country code" required>
                <Select {...form.register("countryCode")} autoComplete="country">
                  <option value="">Select country</option>
                  {(countriesQuery.data ?? []).map((country) => <option key={country.code} value={country.code}>{country.code} - {country.name}</option>)}
                </Select>
              </Field>
              <Field error={form.formState.errors.email} label="Company email">
                <Input {...form.register("email")} autoComplete="off" spellCheck={false} type="email" />
              </Field>
              <Field error={form.formState.errors.phone} label="Phone">
                <Input {...form.register("phone")} autoComplete="tel" type="tel" />
              </Field>
              <Field error={form.formState.errors.website} label="Website">
                <Input {...form.register("website")} autoComplete="off" type="url" />
              </Field>
              <Field error={form.formState.errors.employeeCount} label="Employee count">
                <Input {...form.register("employeeCount")} autoComplete="off" inputMode="numeric" type="number" />
              </Field>
              <div className="md:col-span-2">
                <Field error={form.formState.errors.address} label="Address">
                  <Input {...form.register("address")} autoComplete="street-address" />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field error={form.formState.errors.logoUrl} label="Logo image">
                  <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                    <Input {...form.register("logoUrl")} autoComplete="off" placeholder="https://.../logo.jpg or uploaded image data" />
                    <FileUploadControl
                      accept="image/jpeg,image/png,image/webp"
                      disabled={logoUploadMutation.isPending}
                      error={logoUploadMutation.error}
                      isUploading={logoUploadMutation.isPending}
                      onFileSelect={handleLogoFile}
                      previewAlt="Company logo preview"
                      value={logoValue}
                    />
                  </div>
                  {logoValue ? (
                    <img alt="Company logo preview" className="mt-3 h-16 w-16 rounded-lg border border-border object-cover" src={logoValue} />
                  ) : null}
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field error={form.formState.errors.bio} label="Company bio">
                  <Textarea {...form.register("bio")} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button disabled={updateMutation.isPending} type="submit">Save Company</Button>
                <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate()} type="button" variant="danger">
                  <Trash2 aria-hidden="true" className="size-4" />
                  Delete Company
                </Button>
              </div>
            </form>
          ) : (
            <EmptyState
              description="Drivers can review company identity, but profile changes are reserved for company admins."
              title="Read-only company profile"
            />
          )}
        </Surface>
      </div>
    </div>
  );
}

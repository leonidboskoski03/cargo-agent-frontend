import { zodResolver } from "@hookform/resolvers/zod";
import { BriefcaseBusiness, Building2, CheckCircle2, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  completeCompanyRegistration,
  completeJobSeekerRegistration,
  startCompanyRegistration,
  verifyRegistrationOtp,
  type RegistrationStartResponse,
} from "@/shared/api/modules/auth";
import { getMe } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { OtpCodeInput } from "@/shared/components/ui/OtpCodeInput";
import { Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import {
  companyProfileSchema,
  jobSeekerProfileSchema,
  registrationOtpSchema,
  registrationStartSchema,
  type CompanyProfileInput,
  type CompanyProfileValues,
  type JobSeekerProfileInput,
  type JobSeekerProfileValues,
  type RegistrationOtpValues,
  type RegistrationStartInput,
  type RegistrationStartValues,
} from "@/features/auth/authSchemas";

type AccountKind = "COMPANY" | "JOB_SEEKER";
type WizardStep = "account" | "otp" | "company" | "jobSeeker";

export function RegistrationStartPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [step, setStep] = useState<WizardStep>("account");
  const [accountKind, setAccountKind] = useState<AccountKind>("COMPANY");
  const [registration, setRegistration] = useState<RegistrationStartResponse | null>(null);

  const accountForm = useForm<RegistrationStartInput, unknown, RegistrationStartValues>({
    resolver: zodResolver(registrationStartSchema),
    defaultValues: { email: "", firstName: "", lastName: "", password: "", phone: "" },
  });

  const otpForm = useForm<RegistrationOtpValues>({
    resolver: zodResolver(registrationOtpSchema),
    defaultValues: { code: "" },
  });
  const otpCode = useWatch({ control: otpForm.control, name: "code" });

  const companyForm = useForm<CompanyProfileInput, unknown, CompanyProfileValues>({
    resolver: zodResolver(companyProfileSchema),
    defaultValues: {
      address: "",
      city: "",
      companyEmail: "",
      companyName: "",
      companyType: "CARRIER",
      contactPhone: "",
      countryCode: "",
      planCode: "FREE",
      registrationNumber: "",
      vatNumber: "",
      website: "",
    },
  });

  const jobSeekerForm = useForm<JobSeekerProfileInput, unknown, JobSeekerProfileValues>({
    resolver: zodResolver(jobSeekerProfileSchema),
    defaultValues: {
      availability: "",
      city: "",
      countryCode: "",
      headline: "",
      preferredRoutesText: "",
      yearsExperience: "",
    },
  });

  const startMutation = useAppMutation({
    messages: { success: "Verification code sent" },
    mutationFn: (values: RegistrationStartValues) => startCompanyRegistration({ ...values, kind: accountKind }),
    onSuccess: (data) => {
      setRegistration(data);
      setStep("otp");
    },
  });

  const otpMutation = useAppMutation({
    messages: { success: "Email verified" },
    mutationFn: (values: RegistrationOtpValues) => {
      if (!registration) throw new Error("Registration draft is missing.");
      return verifyRegistrationOtp({ code: values.code, draftId: registration.draftId });
    },
    onSuccess: (data) => setStep(data.kind === "JOB_SEEKER" ? "jobSeeker" : "company"),
  });

  const completeCompanyMutation = useAppMutation({
    messages: { success: "Company account created" },
    mutationFn: (values: CompanyProfileValues) => {
      if (!registration) throw new Error("Registration draft is missing.");
      return completeCompanyRegistration({ ...values, draftId: registration.draftId });
    },
    onSuccess: async () => {
      const profile = await getMe();
      setUser(profile);
      navigate("/dashboard", { replace: true });
    },
  });

  const completeJobSeekerMutation = useAppMutation({
    messages: { success: "Job seeker account created" },
    mutationFn: (values: JobSeekerProfileValues) => {
      if (!registration) throw new Error("Registration draft is missing.");
      return completeJobSeekerRegistration({ ...values, draftId: registration.draftId });
    },
    onSuccess: async () => {
      const profile = await getMe();
      setUser(profile);
      navigate("/jobs", { replace: true });
    },
  });

  return (
    <main className="min-h-dvh bg-background px-4 py-5">
      <section className="mx-auto max-w-5xl">
        <div className="max-w-5xl text-center">
          <h1 className="mt-1 text-4xl font-semibold leading-[1.07] tracking-[-0.28px]">Create your logistics account.</h1>
          <p className="mt-1 text-sm leading-7 text-muted">
            Register as a company workspace or as an independent job seeker.
          </p>
        </div>

        <div className="mt-4 grid gap-5 lg:grid-cols-[0.35fr_0.65fr]">
          <Surface>
            <div className="space-y-4">
              {[
                ["account", "Account"],
                ["otp", "Verification"],
                ["company", "Company"],
                ["jobSeeker", "Driver profile"],
              ].map(([key, label], index) => (
                <div className={key === "company" && accountKind === "JOB_SEEKER" || key === "jobSeeker" && accountKind === "COMPANY" ? "hidden" : "flex items-center gap-3"} key={key}>
                  <div className="grid size-9 place-items-center rounded-lg bg-surface-pearl text-sm font-semibold text-foreground">
                    {step === key ? <Building2 className="size-4 text-primary" /> : key === "jobSeeker" ? 3 : index + 1}
                  </div>
                  <span className="text-sm font-semibold">{label}</span>
                </div>
              ))}
            </div>
            <Link className="mt-8 block text-sm text-primary" to="/login">
              Already have an account?
            </Link>
          </Surface>

          <Surface>
            {step === "account" ? (
              <form className="space-y-3" onSubmit={accountForm.handleSubmit((values) => startMutation.mutate(values))}>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">{accountKind === "COMPANY" ? "Admin account" : "Job seeker account"}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  <button
                    className={`rounded-xl border p-4 text-left transition hover:border-primary/50 ${accountKind === "COMPANY" ? "border-primary bg-blue-50" : "border-border bg-card"}`}
                    onClick={() => setAccountKind("COMPANY")}
                    type="button"
                  >
                    <Building2 className="size-5 text-primary" />
                    <span className="mt-3 block text-sm font-semibold">Company workspace</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">For carriers, shippers, fleet admins, and company teams.</span>
                  </button>
                  <button
                    className={`rounded-xl border p-4 text-left transition hover:border-primary/50 ${accountKind === "JOB_SEEKER" ? "border-primary bg-blue-50" : "border-border bg-card"}`}
                    onClick={() => setAccountKind("JOB_SEEKER")}
                    type="button"
                  >
                    <UserRound className="size-5 text-primary" />
                    <span className="mt-3 block text-sm font-semibold">Job seeker</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">For drivers looking for work, applications, and vehicle marketplace access.</span>
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={accountForm.formState.errors.firstName} label="First name" required>
                    <Input {...accountForm.register("firstName")} autoComplete="given-name" />
                  </Field>
                  <Field error={accountForm.formState.errors.lastName} label="Last name" required>
                    <Input {...accountForm.register("lastName")} autoComplete="family-name" />
                  </Field>
                </div>
                <div className={"grid gap-4 md:grid-cols-2"}>
                  <Field error={accountForm.formState.errors.email} label="Email" required>
                    <Input {...accountForm.register("email")} autoComplete="email" type="email" />
                  </Field>
                  <Field error={accountForm.formState.errors.password} label="Password" required>
                    <Input {...accountForm.register("password")} autoComplete="new-password" type="password" />
                  </Field>
                </div>
                <div className={"max-w-1/2"}>
                  <Field error={accountForm.formState.errors.phone} label="Phone">
                    <Input {...accountForm.register("phone")} autoComplete="tel" type="tel" />
                  </Field>
                </div>
                <Button disabled={startMutation.isPending} type="submit">Send verification</Button>
              </form>
            ) : null}

            {step === "otp" ? (
              <form className="mx-auto flex min-h-[360px] max-w-md flex-col justify-center space-y-4" onSubmit={otpForm.handleSubmit((values) => otpMutation.mutate(values))}>
                <div className="mx-auto grid size-11 place-items-center rounded-lg bg-surface-pearl">
                  <Mail className="size-5 text-primary" />
                </div>
                <h2 className="text-center text-2xl font-semibold tracking-[-0.28px]">Verify delivery code</h2>
                <p className="text-center text-sm leading-6 text-muted">
                  Enter the OTP delivered to the admin email. Local preview codes are intentionally hidden from the UI.
                </p>
                <Field error={otpForm.formState.errors.code} label="OTP code" required>
                  <OtpCodeInput
                    autoFocus
                    className="justify-center"
                    disabled={otpMutation.isPending}
                    onChange={(code) => otpForm.setValue("code", code, { shouldDirty: true, shouldValidate: true })}
                    value={otpCode}
                  />
                </Field>
                <Button className="w-full" disabled={otpMutation.isPending} type="submit">Verify code</Button>
              </form>
            ) : null}

            {step === "company" ? (
              <form className="space-y-4" onSubmit={companyForm.handleSubmit((values) => completeCompanyMutation.mutate(values))}>
                <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
                  <CheckCircle2 className="size-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">Company profile</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={companyForm.formState.errors.companyName} label="Company name" required>
                    <Input {...companyForm.register("companyName")} />
                  </Field>
                  <Field error={companyForm.formState.errors.companyType} label="Company type" required>
                    <Select {...companyForm.register("companyType")}>
                      <option value="CARRIER">Carrier</option>
                      <option value="SHIPPER">Shipper</option>
                      <option value="BOTH">Both</option>
                    </Select>
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={companyForm.formState.errors.registrationNumber} label="Registration number" required>
                    <Input {...companyForm.register("registrationNumber")} />
                  </Field>
                  <Field error={companyForm.formState.errors.vatNumber} label="VAT number">
                    <Input {...companyForm.register("vatNumber")} />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-[0.4fr_0.6fr]">
                  <Field error={companyForm.formState.errors.countryCode} label="Country code" required>
                    <Input {...companyForm.register("countryCode")} placeholder="MK" />
                  </Field>
                  <Field error={companyForm.formState.errors.city} label="City" required>
                    <Input {...companyForm.register("city")} />
                  </Field>
                </div>
                <Field error={companyForm.formState.errors.address} label="Address" required>
                  <Textarea {...companyForm.register("address")} />
                </Field>
                <Button disabled={completeCompanyMutation.isPending} type="submit">Create workspace</Button>
              </form>
            ) : null}

            {step === "jobSeeker" ? (
              <form className="space-y-4" onSubmit={jobSeekerForm.handleSubmit((values) => completeJobSeekerMutation.mutate(values))}>
                <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
                  <BriefcaseBusiness className="size-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">Driver profile</h2>
                <p className="text-sm leading-6 text-muted">Add the work context companies need before they review your applications or marketplace listings.</p>
                <div className="grid gap-4 md:grid-cols-[0.4fr_0.6fr]">
                  <Field error={jobSeekerForm.formState.errors.countryCode} label="Country code" required>
                    <Input {...jobSeekerForm.register("countryCode")} placeholder="MK" />
                  </Field>
                  <Field error={jobSeekerForm.formState.errors.city} label="City" required>
                    <Input {...jobSeekerForm.register("city")} placeholder="Prilep" />
                  </Field>
                </div>
                <Field error={jobSeekerForm.formState.errors.headline} label="Headline">
                  <Input {...jobSeekerForm.register("headline")} placeholder="International truck driver, ADR certified" />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={jobSeekerForm.formState.errors.yearsExperience?.message} label="Years experience">
                    <Input {...jobSeekerForm.register("yearsExperience")} inputMode="numeric" min={0} type="number" />
                  </Field>
                  <Field error={jobSeekerForm.formState.errors.availability} label="Availability">
                    <Input {...jobSeekerForm.register("availability")} placeholder="Available from July, full time" />
                  </Field>
                </div>
                <Field error={jobSeekerForm.formState.errors.preferredRoutesText} label="Preferred routes">
                  <Textarea {...jobSeekerForm.register("preferredRoutesText")} placeholder="Skopje - Sofia, Bitola - Tirana" />
                </Field>
                <Button disabled={completeJobSeekerMutation.isPending} type="submit">Create job seeker account</Button>
              </form>
            ) : null}
          </Surface>
        </div>
      </section>
    </main>
  );
}

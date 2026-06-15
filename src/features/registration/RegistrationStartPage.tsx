import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BriefcaseBusiness, Building2, CheckCircle2, Mail, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  completeCompanyRegistration,
  completeJobSeekerRegistration,
  resendOtp,
  startCompanyRegistration,
  verifyRegistrationOtp,
  type RegistrationStartResponse,
} from "@/shared/api/modules/auth";
import { listSupportedCountries } from "@/shared/api/modules/geo";
import { getMe } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { CountryCombobox } from "@/shared/components/ui/CountryCombobox";
import { OtpCodeInput } from "@/shared/components/ui/OtpCodeInput";
import { PhonePrefixInput } from "@/shared/components/ui/PhonePrefixInput";
import { Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { cn } from "@/shared/lib/cn";
import { useAuthStore } from "@/features/auth/authStore";
import { OtpResendButton } from "@/features/auth/OtpResendButton";
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

const accountOptions = [
  {
    description: "For carriers, shippers, fleet admins, and company teams.",
    icon: Building2,
    kind: "COMPANY" as const,
    label: "Company workspace",
  },
  {
    description: "For drivers looking for work, applications, and vehicle marketplace access.",
    icon: UserRound,
    kind: "JOB_SEEKER" as const,
    label: "Job seeker",
  },
];

const experienceOptions = [
  { label: "0-1 years", value: "1" },
  { label: "2-5 years", value: "3" },
  { label: "6-10 years", value: "8" },
  { label: "10+ years", value: "12" },
];

const fallbackCountries = [
  { code: "MK", name: "North Macedonia" },
  { code: "RS", name: "Serbia" },
  { code: "BG", name: "Bulgaria" },
];

export function RegistrationStartPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [step, setStep] = useState<WizardStep>("account");
  const [accountKind, setAccountKind] = useState<AccountKind>("COMPANY");
  const [registration, setRegistration] = useState<RegistrationStartResponse | null>(null);
  const countriesQuery = useQuery({ queryFn: listSupportedCountries, queryKey: ["geo", "countries"], staleTime: 1000 * 60 * 30 });

  const accountForm = useForm<RegistrationStartInput, unknown, RegistrationStartValues>({
    resolver: zodResolver(registrationStartSchema),
    defaultValues: { email: "", firstName: "", lastName: "", password: "", phone: "" },
  });
  const accountPhone = useWatch({ control: accountForm.control, name: "phone" }) ?? "";

  const otpForm = useForm<RegistrationOtpValues>({
    resolver: zodResolver(registrationOtpSchema),
    defaultValues: { code: "" },
  });
  const otpCode = useWatch({ control: otpForm.control, name: "code" }) ?? "";
  const lastAutoSubmittedOtpCode = useRef("");

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
  const companyCountryCode = useWatch({ control: companyForm.control, name: "countryCode" }) ?? "";

  const jobSeekerForm = useForm<JobSeekerProfileInput, unknown, JobSeekerProfileValues>({
    resolver: zodResolver(jobSeekerProfileSchema),
    defaultValues: {
      availability: "",
      city: "",
      countryCode: "",
      headline: "",
      yearsExperience: "",
    },
  });
  const jobSeekerCountryCode = useWatch({ control: jobSeekerForm.control, name: "countryCode" }) ?? "";

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
    onSuccess: (data) => {
      if (data.kind === "JOB_SEEKER") {
        completeJobSeekerMutation.mutate({ draftId: data.draftId });
        return;
      }

      setStep("company");
    },
  });

  const resendOtpMutation = useAppMutation({
    messages: { success: "Verification code resent" },
    mutationFn: () => {
      if (!registration) throw new Error("Registration draft is missing.");
      return resendOtp({ challengeId: registration.challengeId });
    },
    onSuccess: (data) => {
      setRegistration((current) =>
        current
          ? {
              ...current,
              challengeId: data.challengeId,
              expiresAt: data.expiresAt,
              nextResendAt: data.nextResendAt,
              resendAttemptsRemaining: data.resendAttemptsRemaining,
            }
          : current,
      );
      otpForm.reset();
    },
  });

  useEffect(() => {
    if (step !== "otp" || !registration) {
      lastAutoSubmittedOtpCode.current = "";
      return;
    }

    if (otpCode.length < 6) {
      lastAutoSubmittedOtpCode.current = "";
      return;
    }

    if (otpMutation.isPending || lastAutoSubmittedOtpCode.current === otpCode) return;

    const parsed = registrationOtpSchema.safeParse({ code: otpCode });
    if (!parsed.success) return;

    lastAutoSubmittedOtpCode.current = otpCode;
    otpMutation.mutate(parsed.data);
  }, [otpCode, otpMutation, registration, step]);

  const completeCompanyMutation = useAppMutation({
    messages: { success: "Company account created" },
    mutationFn: (values: CompanyProfileValues) => {
      if (!registration) throw new Error("Registration draft is missing.");
      return completeCompanyRegistration({ ...values, draftId: registration.draftId });
    },
    onSuccess: async () => {
      const profile = await getMe();
      setUser(profile);
      navigate("/onboarding", { replace: true });
    },
  });

  const completeJobSeekerMutation = useAppMutation({
    messages: { success: "Job seeker account created" },
    mutationFn: (values: Partial<JobSeekerProfileValues> & { draftId?: string }) => {
      const draftId = values.draftId ?? registration?.draftId;
      if (!draftId) throw new Error("Registration draft is missing.");
      return completeJobSeekerRegistration({ ...values, draftId });
    },
    onSuccess: async () => {
      const profile = await getMe();
      setUser(profile);
      navigate("/onboarding", { replace: true });
    },
  });

  const visibleSteps = accountKind === "JOB_SEEKER"
    ? [
        { key: "account" as const, label: "Account" },
        { key: "otp" as const, label: "Verification" },
      ]
    : [
        { key: "account" as const, label: "Account" },
        { key: "otp" as const, label: "Verification" },
        { key: "company" as const, label: "Company profile" },
      ];
  const currentStepIndex = Math.max(0, visibleSteps.findIndex((item) => item.key === step));
  const progressPercent = currentStepIndex / Math.max(1, visibleSteps.length - 1) * 100;
  const countries = countriesQuery.data?.length ? countriesQuery.data : fallbackCountries;

  return (
    <main className="min-h-dvh bg-background px-4 py-4 lg:h-dvh lg:overflow-hidden">
      <section className="mx-auto grid h-full max-w-6xl gap-4 lg:grid-cols-[18rem_1fr] lg:items-start">
        <div className="space-y-4">
          <div>
            <Link className="text-sm font-semibold text-primary" to="/login">
              Already have an account?
            </Link>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-foreground">Create your Cargo Agent account</h1>
            <p className="mt-2 text-sm leading-6 text-muted">Choose how you work, verify your email, then complete the profile needed to enter the logistics workspace.</p>
          </div>

          <Surface className="p-4">
            <div className="relative hidden gap-4 lg:grid">
              <div className="absolute left-[17px] top-5 h-[calc(100%-2.5rem)] w-px bg-border" aria-hidden="true" />
              {visibleSteps.map((item, index) => {
                const isCurrent = step === item.key;
                const isDone = index < currentStepIndex;
                return (
                  <div className="relative flex items-center gap-3" key={item.key}>
                    <div
                      className={cn(
                        "z-10 grid size-9 place-items-center rounded-full border bg-card text-xs font-semibold transition",
                        isDone && "border-primary bg-primary text-primary-foreground",
                        isCurrent && "border-primary text-primary shadow-[0_0_0_4px_rgba(37,99,235,0.12)]",
                      )}
                    >
                      {isDone ? <CheckCircle2 className="size-4" /> : index + 1}
                    </div>
                    <div>
                      <p className={cn("text-sm font-semibold", isCurrent ? "text-foreground" : "text-muted")}>{item.label}</p>
                      <p className="text-xs font-normal text-muted">{isDone ? "Complete" : isCurrent ? "Current step" : "Next"}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:hidden">
              <div className="flex items-center justify-between text-xs font-semibold text-muted">
                {visibleSteps.map((item) => <span key={item.key}>{item.label}</span>)}
              </div>
              <div className="mt-3 h-2 rounded-full bg-surface-pearl">
                <motion.div animate={{ width: `${progressPercent}%` }} className="h-full rounded-full bg-primary" />
              </div>
            </div>
          </Surface>
        </div>

        <Surface className="max-h-none overflow-visible p-4 lg:max-h-[calc(100dvh-2rem)] lg:overflow-y-auto">
          <motion.div animate={{ opacity: 1, y: 0 }} initial={{ opacity: 0, y: 8 }} key={step} transition={{ duration: 0.18 }}>
            {step === "account" ? (
              <form className="space-y-4" onSubmit={accountForm.handleSubmit((values) => startMutation.mutate(values))}>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted">Step 1 of 3</p>
                  <h2 className="mt-1 text-2xl font-semibold">{accountKind === "COMPANY" ? "Company admin account" : "Job seeker account"}</h2>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {accountOptions.map((option) => {
                    const Icon = option.icon;
                    const selected = accountKind === option.kind;
                    return (
                      <button
                        className={cn(
                          "rounded-lg border p-4 text-left transition hover:border-primary/50",
                          selected ? "border-primary bg-blue-50" : "border-border bg-card",
                        )}
                        key={option.kind}
                        onClick={() => setAccountKind(option.kind)}
                        type="button"
                      >
                        <Icon className="size-5 text-primary" />
                        <span className="mt-3 block text-sm font-semibold">{option.label}</span>
                        <span className="mt-1 block text-xs leading-5 text-muted">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={accountForm.formState.errors.firstName} label="First name" required>
                    <Input {...accountForm.register("firstName")} autoComplete="given-name" placeholder="Ada" />
                  </Field>
                  <Field error={accountForm.formState.errors.lastName} label="Last name" required>
                    <Input {...accountForm.register("lastName")} autoComplete="family-name" placeholder="Novak" />
                  </Field>
                </div>
                <div className={"grid gap-4 md:grid-cols-2"}>
                  <Field error={accountForm.formState.errors.email} label="Email" required>
                    <Input {...accountForm.register("email")} autoComplete="email" placeholder="ada@carrier.com" type="email" />
                  </Field>
                  <Field error={accountForm.formState.errors.password} label="Password" required>
                    <Input {...accountForm.register("password")} autoComplete="new-password" placeholder="At least 8 characters" type="password" />
                  </Field>
                </div>
                <div className="max-w-md">
                  <Field error={accountForm.formState.errors.phone} label="Phone" required>
                    <PhonePrefixInput
                      countries={countries}
                      disabled={startMutation.isPending}
                      onChange={(phone) => accountForm.setValue("phone", phone, { shouldDirty: true, shouldValidate: true })}
                      value={accountPhone}
                    />
                  </Field>
                </div>
                <Button disabled={startMutation.isPending} type="submit">
                  Send verification
                  <ArrowRight className="size-4" />
                </Button>
              </form>
            ) : null}

            {step === "otp" ? (
              <form className="mx-auto flex min-h-[340px] max-w-md flex-col justify-center space-y-4" onSubmit={otpForm.handleSubmit((values) => otpMutation.mutate(values))}>
                <div className="mx-auto grid size-11 place-items-center rounded-lg bg-surface-pearl">
                  <Mail className="size-5 text-primary" />
                </div>
                <h2 className="text-center text-2xl font-semibold tracking-[-0.28px]">Verify delivery code</h2>
                <p className="text-center text-sm leading-6 text-muted">
                  Enter the 6-digit code sent to your email. Local preview codes stay hidden from the UI.
                </p>
                <Field error={otpForm.formState.errors.code} label="OTP code" required>
                  <OtpCodeInput
                    autoFocus
                    className="justify-center"
                    disabled={otpMutation.isPending || resendOtpMutation.isPending}
                    onChange={(code) => otpForm.setValue("code", code, { shouldDirty: true, shouldValidate: true })}
                    value={otpCode}
                  />
                </Field>
                {registration ? (
                  <OtpResendButton
                    attemptsRemaining={registration.resendAttemptsRemaining}
                    className="flex flex-col items-center"
                    disabled={otpMutation.isPending}
                    isPending={resendOtpMutation.isPending}
                    nextResendAt={registration.nextResendAt}
                    onResend={() => resendOtpMutation.mutate()}
                  />
                ) : null}
                <Button className="w-full" disabled={otpMutation.isPending} type="submit">Verify code</Button>
              </form>
            ) : null}

            {step === "company" ? (
              <form className="space-y-4" onSubmit={companyForm.handleSubmit((values) => completeCompanyMutation.mutate(values))}>
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl">
                    <CheckCircle2 className="size-5 text-primary" />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase text-muted">Step 3 of 3</p>
                  <h2 className="mt-1 text-2xl font-semibold">Company profile</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={companyForm.formState.errors.companyName} label="Company name" required>
                    <Input {...companyForm.register("companyName")} placeholder="Balkan Freight DOO" />
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
                    <Input {...companyForm.register("registrationNumber")} placeholder="MK-4030999123456" />
                  </Field>
                  <Field error={companyForm.formState.errors.vatNumber} label="VAT number">
                    <Input {...companyForm.register("vatNumber")} placeholder="MK4030999123456" />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-[0.4fr_0.6fr]">
                  <Field error={companyForm.formState.errors.countryCode} label="Country" required>
                    <CountryCombobox
                      countries={countries}
                      disabled={completeCompanyMutation.isPending}
                      onChange={(countryCode) => companyForm.setValue("countryCode", countryCode, { shouldDirty: true, shouldValidate: true })}
                      value={companyCountryCode}
                    />
                  </Field>
                  <Field error={companyForm.formState.errors.city} label="City" required>
                    <Input {...companyForm.register("city")} placeholder="Skopje" />
                  </Field>
                </div>
                <Field error={companyForm.formState.errors.address} label="Address">
                  <Textarea className="min-h-24 resize-none" {...companyForm.register("address")} placeholder="Industrial Zone 12, Skopje" />
                </Field>
                <Button disabled={completeCompanyMutation.isPending} type="submit">Create workspace</Button>
              </form>
            ) : null}

            {step === "jobSeeker" ? (
              <form className="space-y-4" onSubmit={jobSeekerForm.handleSubmit((values) => completeJobSeekerMutation.mutate(values))}>
                <div>
                  <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl">
                    <BriefcaseBusiness className="size-5 text-primary" />
                  </div>
                  <p className="mt-3 text-xs font-semibold uppercase text-muted">Step 3 of 3</p>
                  <h2 className="mt-1 text-2xl font-semibold">Driver profile</h2>
                </div>
                <p className="text-sm leading-6 text-muted">Add the work context companies need before they review your applications or marketplace listings.</p>
                <div className="grid gap-4 md:grid-cols-[0.4fr_0.6fr]">
                  <Field error={jobSeekerForm.formState.errors.countryCode} label="Country" required>
                    <CountryCombobox
                      countries={countries}
                      disabled={completeJobSeekerMutation.isPending}
                      onChange={(countryCode) => jobSeekerForm.setValue("countryCode", countryCode, { shouldDirty: true, shouldValidate: true })}
                      value={jobSeekerCountryCode}
                    />
                  </Field>
                  <Field error={jobSeekerForm.formState.errors.city} label="City" required>
                    <Input {...jobSeekerForm.register("city")} placeholder="Prilep" />
                  </Field>
                </div>
                <Field error={jobSeekerForm.formState.errors.headline} label="Professional headline">
                  <Input {...jobSeekerForm.register("headline")} placeholder="International truck driver, ADR certified" />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={jobSeekerForm.formState.errors.yearsExperience?.message} label="Years experience">
                    <Select {...jobSeekerForm.register("yearsExperience")}>
                      <option value="">Select range</option>
                      {experienceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  </Field>
                  <Field error={jobSeekerForm.formState.errors.availability} label="Available from">
                    <Input {...jobSeekerForm.register("availability")} type="date" />
                  </Field>
                </div>
                <Button disabled={completeJobSeekerMutation.isPending} type="submit">Create job seeker account</Button>
              </form>
            ) : null}
          </motion.div>
        </Surface>
      </section>
    </main>
  );
}

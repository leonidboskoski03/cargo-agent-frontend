import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CheckCircle2, Mail } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import {
  completeCompanyRegistration,
  startCompanyRegistration,
  verifyRegistrationOtp,
  type RegistrationStartResponse,
} from "@/shared/api/modules/auth";
import { getMe } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import {
  companyProfileSchema,
  registrationOtpSchema,
  registrationStartSchema,
  type CompanyProfileInput,
  type CompanyProfileValues,
  type RegistrationOtpValues,
  type RegistrationStartInput,
  type RegistrationStartValues,
} from "@/features/auth/authSchemas";

type WizardStep = "account" | "otp" | "company";

export function RegistrationStartPage() {
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const [step, setStep] = useState<WizardStep>("account");
  const [registration, setRegistration] = useState<RegistrationStartResponse | null>(null);

  const accountForm = useForm<RegistrationStartInput, unknown, RegistrationStartValues>({
    resolver: zodResolver(registrationStartSchema),
    defaultValues: { email: "", firstName: "", lastName: "", password: "", phone: "" },
  });

  const otpForm = useForm<RegistrationOtpValues>({
    resolver: zodResolver(registrationOtpSchema),
    defaultValues: { code: "" },
  });

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

  const startMutation = useAppMutation({
    messages: { success: "Verification code sent" },
    mutationFn: (values: RegistrationStartValues) => startCompanyRegistration({ ...values, kind: "COMPANY" }),
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
    onSuccess: () => setStep("company"),
  });

  const completeMutation = useAppMutation({
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

  return (
    <main className="min-h-dvh bg-background px-4 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-normal text-primary">Company registration wizard</p>
          <h1 className="mt-3 text-5xl font-semibold leading-[1.07] tracking-[-0.28px]">Create your Cargo Agent workspace.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Start with a verified company admin account, then complete the company profile needed for marketplace operations.
          </p>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.35fr_0.65fr]">
          <Surface>
            <div className="space-y-4">
              {[
                ["account", "Account"],
                ["otp", "Verification"],
                ["company", "Company"],
              ].map(([key, label], index) => (
                <div className="flex items-center gap-3" key={key}>
                  <div className="grid size-9 place-items-center rounded-lg bg-surface-pearl text-sm font-semibold text-foreground">
                    {step === key ? <Building2 className="size-4 text-primary" /> : index + 1}
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
              <form className="space-y-4" onSubmit={accountForm.handleSubmit((values) => startMutation.mutate(values))}>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">Admin account</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={accountForm.formState.errors.firstName} label="First name" required>
                    <Input {...accountForm.register("firstName")} autoComplete="given-name" />
                  </Field>
                  <Field error={accountForm.formState.errors.lastName} label="Last name" required>
                    <Input {...accountForm.register("lastName")} autoComplete="family-name" />
                  </Field>
                </div>
                <Field error={accountForm.formState.errors.email} label="Email" required>
                  <Input {...accountForm.register("email")} autoComplete="email" type="email" />
                </Field>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field error={accountForm.formState.errors.phone} label="Phone">
                    <Input {...accountForm.register("phone")} autoComplete="tel" type="tel" />
                  </Field>
                  <Field error={accountForm.formState.errors.password} label="Password" required>
                    <Input {...accountForm.register("password")} autoComplete="new-password" type="password" />
                  </Field>
                </div>
                <Button disabled={startMutation.isPending} type="submit">Send verification</Button>
              </form>
            ) : null}

            {step === "otp" ? (
              <form className="space-y-4" onSubmit={otpForm.handleSubmit((values) => otpMutation.mutate(values))}>
                <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
                  <Mail className="size-5 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold tracking-[-0.28px]">Verify delivery code</h2>
                <p className="text-sm leading-6 text-muted">
                  Enter the OTP delivered to the admin email. Local preview codes are intentionally hidden from the UI.
                </p>
                <Field error={otpForm.formState.errors.code} label="OTP code" required>
                  <Input {...otpForm.register("code")} autoComplete="one-time-code" inputMode="numeric" />
                </Field>
                <Button disabled={otpMutation.isPending} type="submit">Verify code</Button>
              </form>
            ) : null}

            {step === "company" ? (
              <form className="space-y-4" onSubmit={companyForm.handleSubmit((values) => completeMutation.mutate(values))}>
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
                <Button disabled={completeMutation.isPending} type="submit">Create workspace</Button>
              </form>
            ) : null}
          </Surface>
        </div>
      </section>
    </main>
  );
}

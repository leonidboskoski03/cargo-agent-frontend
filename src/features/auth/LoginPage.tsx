import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKeyhole, Mail, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { login, loginVerifyOtp, resendOtp, verifyOtp } from "@/shared/api/modules/auth";
import { getMe } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { Field } from "@/shared/components/ui/Form";
import { OtpCodeInput } from "@/shared/components/ui/OtpCodeInput";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { ApiClientError } from "@/shared/api/apiClient";
import { useAuthStore } from "./authStore";
import { loginSchema, mfaSchema, type LoginFormValues, type MfaFormValues } from "./authSchemas";
import { OtpResendButton } from "./OtpResendButton";

type MfaState = {
  challengeId: string;
  email: string;
  password: string;
  expiresAt?: string;
  nextResendAt?: string;
  resendAttemptsRemaining?: number;
};

function defaultPathForRole(role: string) {
  return role === "JOB_SEEKER" ? "/job-profile" : "/dashboard";
}

function resolvePostLoginPath(profile: { role: string }, requestedPath: string) {
  if (profile.role === "JOB_SEEKER" && (requestedPath === "/" || requestedPath === "/dashboard")) {
    return "/job-profile";
  }
  return requestedPath;
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);
  const [mfaState, setMfaState] = useState<MfaState | null>(null);
  const fromLocation = (location.state as { from?: { hash?: string; pathname?: string; search?: string } } | null)?.from;
  const from = fromLocation?.pathname ? `${fromLocation.pathname}${fromLocation.search ?? ""}${fromLocation.hash ?? ""}` : null;

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mfaForm = useForm<MfaFormValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: "" },
  });
  const mfaCode = useWatch({ control: mfaForm.control, name: "code" }) ?? "";
  const lastAutoSubmittedMfaCode = useRef("");

  const loginMutation = useAppMutation({
    mutationFn: login,
    onSuccess: async (data, values) => {
      if ("challengeId" in data) {
        setMfaState({
          challengeId: data.challengeId,
          email: values.email,
          expiresAt: data.expiresAt,
          nextResendAt: data.nextResendAt,
          password: values.password,
          resendAttemptsRemaining: data.resendAttemptsRemaining,
        });
        toast.info("Verification required", {
          description: "Enter the OTP code delivered by email or SMS. Preview codes are not shown in the app.",
        });
        return;
      }

      const profile = await getMe();
      setUser(profile);
      navigate(resolvePostLoginPath(profile, from ?? defaultPathForRole(profile.role)), { replace: true });
    },
  });

  const mfaMutation = useAppMutation({
    mutationFn: async (values: MfaFormValues) => {
      if (!mfaState) throw new ApiClientError({ code: "MFA_MISSING", message: "MFA challenge is missing." });
      await verifyOtp({ challengeId: mfaState.challengeId, code: values.code });
      await loginVerifyOtp({
        email: mfaState.email,
        otpChallengeId: mfaState.challengeId,
        password: mfaState.password,
      });
      return getMe();
    },
    onSuccess: (profile) => {
      setUser(profile);
      navigate(resolvePostLoginPath(profile, from ?? defaultPathForRole(profile.role)), { replace: true });
    },
  });

  const resendMfaMutation = useAppMutation({
    messages: { success: "Verification code resent" },
    mutationFn: async () => {
      if (!mfaState) throw new ApiClientError({ code: "MFA_MISSING", message: "MFA challenge is missing." });
      return resendOtp({ challengeId: mfaState.challengeId });
    },
    onSuccess: (data) => {
      setMfaState((current) =>
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
      mfaForm.reset();
    },
  });

  useEffect(() => {
    if (!mfaState) {
      lastAutoSubmittedMfaCode.current = "";
      return;
    }

    if (mfaCode.length < 6) {
      lastAutoSubmittedMfaCode.current = "";
      return;
    }

    if (mfaMutation.isPending || lastAutoSubmittedMfaCode.current === mfaCode) return;

    const parsed = mfaSchema.safeParse({ code: mfaCode });
    if (!parsed.success) return;

    lastAutoSubmittedMfaCode.current = mfaCode;
    mfaMutation.mutate(parsed.data);
  }, [mfaCode, mfaMutation, mfaState]);

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col justify-between bg-surface-black p-8 text-white">
        <div className="grid size-12 place-items-center rounded-lg bg-white text-sm font-semibold text-ink">CA</div>
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-normal text-white/60">{t("auth.login.eyebrow")}</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.07] tracking-[-0.28px]">{t("auth.login.title")}</h1>
          <p className="mt-4 text-base leading-7 text-white/70">{t("auth.login.body")}</p>
        </div>
        <p className="text-xs text-white/50">{t("app.stage")}</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <form
          className="w-full max-w-md rounded-xl border border-border bg-card p-6"
          onSubmit={mfaState ? mfaForm.handleSubmit((values) => mfaMutation.mutate(values)) : loginForm.handleSubmit((values) => loginMutation.mutate(values))}
        >
          <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
            <Shield className="size-5" />
          </div>
          <h2 className="mt-5 text-3xl font-semibold tracking-[-0.28px]">
            {mfaState ? "Verify your login" : t("auth.login.formTitle")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {mfaState
              ? "Use the OTP delivered through your configured channel. The local preview code is intentionally hidden."
              : "Use your Cargo Agent account to continue into the operations workspace."}
          </p>

          <div className="mt-6 space-y-4">
            {mfaState ? (
              <>
                <Field error={mfaForm.formState.errors.code} label="OTP code" required>
                  <OtpCodeInput
                    autoFocus
                    disabled={mfaMutation.isPending}
                    onChange={(code) => mfaForm.setValue("code", code, { shouldDirty: true, shouldValidate: true })}
                    value={mfaCode}
                  />
                </Field>
                <OtpResendButton
                  attemptsRemaining={mfaState.resendAttemptsRemaining}
                  className="flex flex-col items-center pt-2"
                  disabled={mfaMutation.isPending}
                  isPending={resendMfaMutation.isPending}
                  nextResendAt={mfaState.nextResendAt}
                  onResend={() => resendMfaMutation.mutate()}
                />
              </>
            ) : (
              <>
                <Field error={loginForm.formState.errors.email} label={t("fields.email")} required>
                  <span className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 focus-within:border-slate-300">
                    <Mail className="size-4 text-muted" />
                    <input
                      autoComplete="email"
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="you@company.com"
                      type="email"
                      {...loginForm.register("email")}
                    />
                  </span>
                </Field>
                <Field error={loginForm.formState.errors.password} label={t("fields.password")} required>
                  <span className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 focus-within:border-slate-300">
                    <LockKeyhole className="size-4 text-muted" />
                    <input
                      autoComplete="current-password"
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="Enter your password"
                      type="password"
                      {...loginForm.register("password")}
                    />
                  </span>
                </Field>
              </>
            )}
          </div>

          {!mfaState ? (
            <Button className="mt-6 w-full" disabled={loginMutation.isPending || mfaMutation.isPending} type="submit">
              {t("auth.login.submit")}
              <ArrowRight className="size-4" />
            </Button>
          ) : null}
          {!mfaState ? (
            <>
              <Link className="mt-4 block text-center text-sm text-primary" to="/register">
                Create an account
              </Link>
              <Link className="mt-3 block text-center text-sm text-muted hover:text-primary" to="/forgot-password">
                Forgot your password?
              </Link>
            </>
          ) : null}
        </form>
      </section>
    </main>
  );
}

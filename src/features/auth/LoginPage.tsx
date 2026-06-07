import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Mail, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { login, loginVerifyOtp, verifyOtp } from "@/shared/api/modules/auth";
import { getMe } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input } from "@/shared/components/ui/Form";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { ApiClientError } from "@/shared/api/apiClient";
import { useAuthStore } from "./authStore";
import { loginSchema, mfaSchema, type LoginFormValues, type MfaFormValues } from "./authSchemas";

type MfaState = {
  challengeId: string;
  email: string;
  password: string;
};

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const setUser = useAuthStore((state) => state.setUser);
  const [mfaState, setMfaState] = useState<MfaState | null>(null);
  const fromLocation = (location.state as { from?: { hash?: string; pathname?: string; search?: string } } | null)?.from;
  const from = fromLocation?.pathname ? `${fromLocation.pathname}${fromLocation.search ?? ""}${fromLocation.hash ?? ""}` : "/dashboard";

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mfaForm = useForm<MfaFormValues>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { code: "" },
  });

  const loginMutation = useAppMutation({
    mutationFn: login,
    onSuccess: async (data, values) => {
      if ("challengeId" in data) {
        setMfaState({ challengeId: data.challengeId, email: values.email, password: values.password });
        toast.info("Verification required", {
          description: "Enter the OTP code delivered by email or SMS. Preview codes are not shown in the app.",
        });
        return;
      }

      const profile = await getMe();
      setUser(profile);
      navigate(from, { replace: true });
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
      navigate(from, { replace: true });
    },
  });

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
              : "Use your company account to continue into the operations workspace."}
          </p>

          <div className="mt-6 space-y-4">
            {mfaState ? (
              <Field error={mfaForm.formState.errors.code} label="OTP code" required>
                <Input autoComplete="one-time-code" inputMode="numeric" {...mfaForm.register("code")} />
              </Field>
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
                  <Input autoComplete="current-password" placeholder="Enter your password" type="password" {...loginForm.register("password")} />
                </Field>
              </>
            )}
          </div>

          <Button className="mt-6 w-full" disabled={loginMutation.isPending || mfaMutation.isPending} type="submit">
            {mfaState ? "Verify and continue" : t("auth.login.submit")}
            <ArrowRight className="size-4" />
          </Button>
          <Link className="mt-4 block text-center text-sm text-primary" to="/register">
            Create a company account
          </Link>
        </form>
      </section>
    </main>
  );
}

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { forgotPassword, resetPassword, verifyOtp } from "@/shared/api/modules/auth";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input } from "@/shared/components/ui/Form";
import { OtpCodeInput } from "@/shared/components/ui/OtpCodeInput";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { forgotPasswordEmailSchema, forgotPasswordResetSchema, type ForgotPasswordEmailValues, type ForgotPasswordResetValues } from "./authSchemas";

type ResetState = {
  challengeId: string;
  email: string;
  previewCode?: string;
};

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [resetState, setResetState] = useState<ResetState | null>(null);
  const [completed, setCompleted] = useState(false);

  const emailForm = useForm<ForgotPasswordEmailValues>({
    defaultValues: { email: "" },
    resolver: zodResolver(forgotPasswordEmailSchema),
  });

  const resetForm = useForm<ForgotPasswordResetValues>({
    defaultValues: { code: "", confirmPassword: "", newPassword: "" },
    resolver: zodResolver(forgotPasswordResetSchema),
  });
  const resetCode = useWatch({ control: resetForm.control, name: "code" });

  const requestMutation = useAppMutation({
    messages: { success: "Reset code sent" },
    mutationFn: forgotPassword,
    onSuccess: (data, values) => {
      if (data.challengeId) {
        setResetState({ challengeId: data.challengeId, email: values.email, previewCode: data.code });
      }
    },
  });

  const resetMutation = useAppMutation({
    messages: { success: "Password changed" },
    mutationFn: async (values: ForgotPasswordResetValues) => {
      if (!resetState?.challengeId) throw new Error("Password reset challenge is missing.");
      await verifyOtp({ challengeId: resetState.challengeId, code: values.code });
      return resetPassword({ newPassword: values.newPassword, otpChallengeId: resetState.challengeId });
    },
    onSuccess: () => {
      setCompleted(true);
      resetForm.reset();
    },
  });

  return (
    <main className="grid min-h-dvh bg-background lg:grid-cols-[0.9fr_1.1fr]">
      <section className="flex flex-col justify-between bg-surface-black p-8 text-white">
        <Link className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white" to="/login">
          <ArrowLeft className="size-4" />
          Back to login
        </Link>
        <div className="max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-normal text-white/60">Account recovery</p>
          <h1 className="mt-4 text-5xl font-semibold leading-[1.07] tracking-[-0.28px]">Reset your password</h1>
          <p className="mt-4 text-base leading-7 text-white/70">
            We send a short-lived OTP code to the account email, then ask for your new password.
          </p>
        </div>
        <p className="text-xs text-white/50">Cargo Agent secure access</p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6">
          <div className="grid size-11 place-items-center rounded-lg bg-surface-pearl">
            {completed ? <CheckCircle2 className="size-5 text-success" /> : <KeyRound className="size-5" />}
          </div>

          {completed ? (
            <>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.28px]">Password updated</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Use your new password the next time you sign in.</p>
              <Button className="mt-6 w-full" onClick={() => navigate("/login", { replace: true })} type="button">
                Go to login
              </Button>
            </>
          ) : resetState ? (
            <form onSubmit={resetForm.handleSubmit((values) => resetMutation.mutate(values))}>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.28px]">Enter reset code</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Use the OTP sent to {resetState.email}, then choose a new password.</p>
              {resetState.previewCode ? (
                <p className="mt-3 rounded-lg border border-border bg-surface-pearl px-3 py-2 text-xs text-muted">
                  Local preview code: <span className="font-semibold text-foreground">{resetState.previewCode}</span>
                </p>
              ) : null}
              <div className="mt-6 space-y-4">
                <Field error={resetForm.formState.errors.code} label="OTP code" required>
                  <OtpCodeInput
                    autoFocus
                    disabled={resetMutation.isPending}
                    onChange={(code) => resetForm.setValue("code", code, { shouldDirty: true, shouldValidate: true })}
                    value={resetCode}
                  />
                </Field>
                <Field error={resetForm.formState.errors.newPassword} label="New password" required>
                  <Input aria-label="New password" autoComplete="new-password" placeholder="At least 8 characters" type="password" {...resetForm.register("newPassword")} />
                </Field>
                <Field error={resetForm.formState.errors.confirmPassword} label="Confirm password" required>
                  <Input aria-label="Confirm password" autoComplete="new-password" placeholder="Repeat your new password" type="password" {...resetForm.register("confirmPassword")} />
                </Field>
              </div>
              <Button className="mt-6 w-full" disabled={resetMutation.isPending} type="submit">
                Reset password
              </Button>
              <Button className="mt-3 w-full" onClick={() => setResetState(null)} type="button" variant="secondary">
                Use a different email
              </Button>
            </form>
          ) : (
            <form onSubmit={emailForm.handleSubmit((values) => requestMutation.mutate(values))}>
              <h2 className="mt-5 text-3xl font-semibold tracking-[-0.28px]">Find your account</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Enter the email connected to your company or job-seeker account.</p>
              <div className="mt-6">
                <Field error={emailForm.formState.errors.email} label="Email" required>
                  <span className="flex h-10 items-center gap-2 rounded-lg border border-border bg-card px-3 focus-within:border-slate-300">
                    <Mail className="size-4 text-muted" />
                    <input
                      autoComplete="email"
                      aria-label="Email"
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="you@company.com"
                      type="email"
                      {...emailForm.register("email")}
                    />
                  </span>
                </Field>
              </div>
              <Button className="mt-6 w-full" disabled={requestMutation.isPending} type="submit">
                Send reset code
              </Button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

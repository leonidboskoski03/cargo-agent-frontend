import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, LogOut, Mail, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { acceptCompanyInvite, previewCompanyInvite } from "@/shared/api/modules/companyInvites";
import { logout, refreshSession, register, requestOtp, resendOtp, verifyOtp, type OtpChallengeResponse } from "@/shared/api/modules/auth";
import { getMe } from "@/shared/api/modules/users";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input } from "@/shared/components/ui/Form";
import { OtpCodeInput } from "@/shared/components/ui/OtpCodeInput";
import { ErrorState, LoadingState, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { OtpResendButton } from "@/features/auth/OtpResendButton";
import {
  inviteAcceptOtpSchema,
  inviteAcceptSchema,
  inviteAccountOtpSchema,
  inviteAccountSetupSchema,
  type InviteAcceptOtpValues,
  type InviteAccountOtpValues,
  type InviteAccountSetupInput,
  type InviteAccountSetupValues,
} from "@/features/auth/authSchemas";
import { toApiClientError } from "@/shared/api/apiClient";

type InviteStep = "account" | "otp" | "accepted";

function StepDot({ active, done, label }: { active?: boolean; done?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={[
          "grid size-9 place-items-center rounded-lg border text-sm font-semibold transition",
          done ? "border-success bg-success text-white" : active ? "border-primary bg-card text-primary" : "border-border bg-surface-pearl text-muted",
        ].join(" ")}
      >
        {done ? <CheckCircle2 aria-hidden="true" className="size-4" /> : null}
      </span>
      <span className={active ? "text-sm font-semibold text-foreground" : "text-sm font-semibold text-muted"}>{label}</span>
    </div>
  );
}

export function InviteAcceptPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setUser = useAuthStore((state) => state.setUser);
  const token = searchParams.get("token") ?? "";
  const tokenResult = useMemo(() => inviteAcceptSchema.safeParse({ token }), [token]);
  const inviteToken = tokenResult.success ? tokenResult.data.token : null;
  const invitePreviewQuery = useQuery({
    enabled: Boolean(inviteToken),
    queryFn: () => {
      if (!inviteToken) throw new Error("Invite token is invalid.");
      return previewCompanyInvite(inviteToken);
    },
    queryKey: ["company-invite-preview", token],
  });
  const [challenge, setChallenge] = useState<OtpChallengeResponse | null>(null);
  const [accountChallenge, setAccountChallenge] = useState<OtpChallengeResponse | null>(null);
  const [accountDraft, setAccountDraft] = useState<InviteAccountSetupValues | null>(null);
  const [step, setStep] = useState<InviteStep>("account");

  const accountForm = useForm<InviteAccountSetupInput, unknown, InviteAccountSetupValues>({
    resolver: zodResolver(inviteAccountSetupSchema),
    defaultValues: { email: "", firstName: "", lastName: "", password: "" },
  });

  useEffect(() => {
    if (invitePreviewQuery.data?.invitedEmail) {
      accountForm.setValue("email", invitePreviewQuery.data.invitedEmail, { shouldDirty: false, shouldValidate: true });
    }
  }, [accountForm, invitePreviewQuery.data?.invitedEmail]);

  const accountOtpForm = useForm<InviteAccountOtpValues>({
    resolver: zodResolver(inviteAccountOtpSchema),
    defaultValues: { code: "" },
  });
  const accountOtpCode = useWatch({ control: accountOtpForm.control, name: "code" }) ?? "";
  const lastAutoSubmittedAccountOtpCode = useRef("");

  const otpForm = useForm<InviteAcceptOtpValues>({
    resolver: zodResolver(inviteAcceptOtpSchema),
    defaultValues: { code: "" },
  });
  const inviteOtpCode = useWatch({ control: otpForm.control, name: "code" }) ?? "";
  const lastAutoSubmittedInviteOtpCode = useRef("");

  const returnState = { from: { hash: location.hash, pathname: location.pathname, search: location.search } };

  const startAccountMutation = useAppMutation({
    messages: { success: "Account setup code sent" },
    mutationFn: (values: InviteAccountSetupValues) => {
      const invitedEmail = invitePreviewQuery.data?.invitedEmail;
      if (!invitedEmail) throw new Error("Invite preview is not loaded.");
      if (values.email !== invitedEmail) throw new Error("Invite email cannot be changed.");
      return requestOtp({ channel: "EMAIL", email: invitedEmail, purpose: "REGISTER_VERIFY" });
    },
    onSuccess: (data, values) => {
      setAccountDraft({ ...values, email: invitePreviewQuery.data?.invitedEmail ?? values.email });
      setAccountChallenge(data);
      accountOtpForm.reset();
    },
  });

  const completeAccountMutation = useAppMutation({
    messages: { success: "Account created" },
    mutationFn: async (values: InviteAccountOtpValues) => {
      if (!accountDraft || !accountChallenge) throw new Error("Account setup challenge is missing.");
      await verifyOtp({ challengeId: accountChallenge.challengeId, code: values.code });
      await register({
        email: accountDraft.email,
        firstName: accountDraft.firstName,
        lastName: accountDraft.lastName,
        otpChallengeId: accountChallenge.challengeId,
        password: accountDraft.password,
        role: "JOB_SEEKER",
      });
      return getMe();
    },
    onSuccess: (profile) => {
      setUser(profile);
      setAccountChallenge(null);
      setAccountDraft(null);
      accountForm.reset();
      accountOtpForm.reset();
    },
  });

  const resendAccountOtpMutation = useAppMutation({
    messages: { success: "Account setup code resent" },
    mutationFn: () => {
      if (!accountChallenge) throw new Error("Account setup challenge is missing.");
      return resendOtp({ challengeId: accountChallenge.challengeId });
    },
    onSuccess: (data) => {
      setAccountChallenge(data);
      accountOtpForm.reset();
    },
  });

  useEffect(() => {
    if (!accountChallenge || !accountDraft) {
      lastAutoSubmittedAccountOtpCode.current = "";
      return;
    }

    if (accountOtpCode.length < 6) {
      lastAutoSubmittedAccountOtpCode.current = "";
      return;
    }

    if (completeAccountMutation.isPending || lastAutoSubmittedAccountOtpCode.current === accountOtpCode) return;

    const parsed = inviteAccountOtpSchema.safeParse({ code: accountOtpCode });
    if (!parsed.success) return;

    lastAutoSubmittedAccountOtpCode.current = accountOtpCode;
    completeAccountMutation.mutate(parsed.data);
  }, [accountChallenge, accountDraft, accountOtpCode, completeAccountMutation]);

  const requestOtpMutation = useAppMutation({
    messages: { success: "Invite verification code sent" },
    mutationFn: () => {
      if (!user?.email) throw new Error("A signed-in user email is required.");
      return requestOtp({ channel: "EMAIL", email: user.email, purpose: "INVITE_ACCEPT" });
    },
    onSuccess: (data) => {
      setChallenge(data);
      setStep("otp");
      otpForm.reset();
    },
  });

  const resendOtpMutation = useAppMutation({
    messages: { success: "Verification code resent" },
    mutationFn: () => {
      if (!challenge) throw new Error("Invite OTP challenge is missing.");
      return resendOtp({ challengeId: challenge.challengeId });
    },
    onSuccess: (data) => {
      setChallenge(data);
      otpForm.reset();
    },
  });

  const acceptMutation = useAppMutation({
    messages: { success: "Invite accepted" },
    mutationFn: async (values: InviteAcceptOtpValues) => {
      if (!tokenResult.success) throw new Error("Invite token is missing or invalid.");
      if (!challenge) throw new Error("Invite OTP challenge is missing.");
      await verifyOtp({ challengeId: challenge.challengeId, code: values.code });
      await acceptCompanyInvite({ otpChallengeId: challenge.challengeId, token: tokenResult.data.token });
      await refreshSession();
      queryClient.clear();
      const profile = await getMe();
      return profile;
    },
    onSuccess: (profile) => {
      setUser(profile);
      setStep("accepted");
      navigate("/dashboard", { replace: true });
    },
  });

  useEffect(() => {
    if (!challenge || step !== "otp") {
      lastAutoSubmittedInviteOtpCode.current = "";
      return;
    }

    if (inviteOtpCode.length < 6) {
      lastAutoSubmittedInviteOtpCode.current = "";
      return;
    }

    if (acceptMutation.isPending || lastAutoSubmittedInviteOtpCode.current === inviteOtpCode) return;

    const parsed = inviteAcceptOtpSchema.safeParse({ code: inviteOtpCode });
    if (!parsed.success) return;

    lastAutoSubmittedInviteOtpCode.current = inviteOtpCode;
    acceptMutation.mutate(parsed.data);
  }, [acceptMutation, challenge, inviteOtpCode, step]);

  const switchAccountMutation = useAppMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.clear();
      clearUser();
      navigate("/login", { replace: true, state: returnState });
    },
  });

  if (status === "checking") {
    return <LoadingState description="Checking the current browser session before accepting the invite." title="Checking invite session" />;
  }

  if (!tokenResult.success) {
    return (
      <main className="min-h-dvh bg-background px-4 py-10">
        <section className="mx-auto max-w-3xl">
          <ErrorState
            action={<Link className="text-sm font-semibold text-primary" to="/login">Go to login</Link>}
            description="This invite link does not include a valid token. Ask your company admin for a fresh invite."
            title="Invite link is incomplete"
          />
        </section>
      </main>
    );
  }

  const acceptError = acceptMutation.error ? toApiClientError(acceptMutation.error) : null;
  const isEmailMismatch = acceptError?.code === "INVITE_EMAIL_MISMATCH" || acceptError?.code === "USER_ALREADY_IN_ANOTHER_COMPANY";
  const invitePreview = invitePreviewQuery.data;

  return (
    <main className="min-h-dvh bg-background px-4 py-8">
      <section className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[0.42fr_0.58fr]">
        <aside className="flex min-h-[560px] flex-col justify-between rounded-[24px] bg-surface-black p-7 text-white">
          <div className="grid size-12 place-items-center rounded-lg bg-white text-sm font-semibold text-ink">CA</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-normal text-white/55">Company invite</p>
            <h1 className="mt-4 text-5xl font-semibold leading-[1.07] tracking-[-0.28px]">Join the workspace with one verified handoff.</h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/68">
              Cargo Agent confirms your account email, verifies the invite code, and refreshes your role before opening the company dashboard.
            </p>
          </div>
          <div className="space-y-4">
            <StepDot active={step === "account"} done={Boolean(user)} label="Signed-in account" />
            <StepDot active={step === "otp"} done={step === "accepted"} label="Invite OTP" />
            <StepDot active={step === "accepted"} done={step === "accepted"} label="Workspace access" />
          </div>
        </aside>

        <section className="flex items-center">
          <Surface className="w-full rounded-[24px] p-6 md:p-8">
            {invitePreviewQuery.isLoading ? (
              <LoadingState description="Reading the invite before account setup." title="Loading invite" />
            ) : invitePreviewQuery.error ? (
              <ErrorState
                action={<Link className="text-sm font-semibold text-primary" to="/login">Go to login</Link>}
                description="This invite could not be loaded. Ask your company admin for a fresh invite."
                error={invitePreviewQuery.error}
                title="Unable to load invite"
              />
            ) : !user ? (
              <div>
                <div className="grid size-12 place-items-center rounded-lg bg-surface-pearl">
                  <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
                </div>
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.28px]">Set up your invited account</h2>
                <p className="mt-2 text-sm leading-6 text-muted">
                  Create your password for the email that received this invite. You will stay here and accept the company invite after email verification.
                </p>
                {invitePreview ? (
                  <div className="mt-5 rounded-xl bg-surface-pearl p-4">
                    <p className="text-xs font-semibold uppercase text-muted">Invite target</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{invitePreview.company.name}</p>
                    <p className="mt-1 text-sm text-muted">{invitePreview.invitedEmail} / {invitePreview.targetRole.replace("_", " ")}</p>
                  </div>
                ) : null}

                {!accountChallenge ? (
                  <form className="mt-6 space-y-4" onSubmit={accountForm.handleSubmit((values) => startAccountMutation.mutate(values))}>
                    <Field error={accountForm.formState.errors.email} label="Invited email" required>
                      <Input {...accountForm.register("email")} autoComplete="email" readOnly type="email" />
                    </Field>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Field error={accountForm.formState.errors.firstName} label="First name" required>
                        <Input {...accountForm.register("firstName")} autoComplete="given-name" />
                      </Field>
                      <Field error={accountForm.formState.errors.lastName} label="Last name" required>
                        <Input {...accountForm.register("lastName")} autoComplete="family-name" />
                      </Field>
                    </div>
                    <Field error={accountForm.formState.errors.password} label="Password" required>
                      <Input {...accountForm.register("password")} autoComplete="new-password" type="password" />
                    </Field>
                    <Button disabled={startAccountMutation.isPending || !invitePreview} type="submit">
                      Send account setup code
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Button>
                  </form>
                ) : (
                  <form className="mt-6 space-y-4" onSubmit={accountOtpForm.handleSubmit((values) => completeAccountMutation.mutate(values))}>
                    <div className="rounded-xl bg-surface-pearl p-4">
                      <p className="text-sm font-semibold text-foreground">Code sent to {accountDraft?.email}</p>
                      <p className="mt-1 text-sm leading-6 text-muted">Enter the account setup OTP, then continue with invite verification.</p>
                    </div>
                    <Field error={accountOtpForm.formState.errors.code} label="Account setup OTP" required>
                      <OtpCodeInput
                        autoFocus
                        disabled={completeAccountMutation.isPending || resendAccountOtpMutation.isPending}
                        onChange={(code) => accountOtpForm.setValue("code", code, { shouldDirty: true, shouldValidate: true })}
                        value={accountOtpCode}
                      />
                    </Field>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button disabled={completeAccountMutation.isPending} type="submit">
                        Verify code
                      </Button>
                      <OtpResendButton
                        attemptsRemaining={accountChallenge.resendAttemptsRemaining}
                        disabled={completeAccountMutation.isPending}
                        isPending={resendAccountOtpMutation.isPending}
                        nextResendAt={accountChallenge.nextResendAt}
                        onResend={() => resendAccountOtpMutation.mutate()}
                      />
                    </div>
                  </form>
                )}

                <div className="mt-6 border-t border-border pt-5">
                  <p className="text-sm leading-6 text-muted">Already set up your password?</p>
                  <Button className="mt-3" onClick={() => navigate("/login", { state: returnState })} type="button" variant="secondary">
                    Sign in instead
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-normal text-primary">Signed in as</p>
                    <h2 className="mt-2 text-3xl font-semibold tracking-[-0.28px]">{user.email}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      Invite acceptance uses this account email{invitePreview ? ` and is locked to ${invitePreview.invitedEmail}` : ""}.
                    </p>
                  </div>
                  <Button disabled={switchAccountMutation.isPending} onClick={() => switchAccountMutation.mutate()} type="button" variant="secondary">
                    <LogOut aria-hidden="true" className="size-4" />
                    Switch account
                  </Button>
                </div>

                {acceptError ? (
                  <div className="mt-5">
                    <ErrorState
                      action={isEmailMismatch ? (
                        <Button disabled={switchAccountMutation.isPending} onClick={() => switchAccountMutation.mutate()} type="button" variant="secondary">
                          Sign in with invited email
                        </Button>
                      ) : null}
                      description={isEmailMismatch ? "This invite belongs to a different account email. Sign out, then sign in with the address that received the invite." : undefined}
                      error={acceptMutation.error}
                      title="Invite could not be accepted"
                    />
                  </div>
                ) : null}

                {!challenge ? (
                  <div className="mt-6 rounded-xl bg-surface-pearl p-5">
                    <div className="grid size-11 place-items-center rounded-lg bg-card">
                      <Mail aria-hidden="true" className="size-5 text-primary" />
                    </div>
                    <h3 className="mt-4 text-2xl font-semibold tracking-[-0.28px]">Send invite verification</h3>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      We will send an invite-specific OTP to your signed-in email before joining the company workspace.
                    </p>
                    <Button className="mt-5" disabled={requestOtpMutation.isPending} onClick={() => requestOtpMutation.mutate()} type="button">
                      Send verification code
                    </Button>
                  </div>
                ) : (
                  <form className="mt-6 space-y-5" onSubmit={otpForm.handleSubmit((values) => acceptMutation.mutate(values))}>
                    <div>
                      <h3 className="text-2xl font-semibold tracking-[-0.28px]">Enter invite OTP</h3>
                      <p className="mt-1 text-sm leading-6 text-muted">A code was sent to {user.email}. It expires with the current challenge.</p>
                    </div>
                    <Field error={otpForm.formState.errors.code} label="OTP code" required>
                      <OtpCodeInput
                        autoFocus
                        disabled={acceptMutation.isPending || resendOtpMutation.isPending}
                        onChange={(code) => otpForm.setValue("code", code, { shouldDirty: true, shouldValidate: true })}
                        value={inviteOtpCode}
                      />
                    </Field>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button disabled={acceptMutation.isPending} type="submit">
                        Accept invite
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </Button>
                      <OtpResendButton
                        attemptsRemaining={challenge.resendAttemptsRemaining}
                        disabled={acceptMutation.isPending}
                        isPending={resendOtpMutation.isPending}
                        nextResendAt={challenge.nextResendAt}
                        onResend={() => resendOtpMutation.mutate()}
                      />
                    </div>
                  </form>
                )}
              </div>
            )}
          </Surface>
        </section>
      </section>
    </main>
  );
}

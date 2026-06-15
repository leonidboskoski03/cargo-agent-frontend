import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuthStore } from "@/features/auth/authStore";
import { InviteAcceptPage } from "@/features/invites/InviteAcceptPage";
import { RegistrationStartPage } from "@/features/registration/RegistrationStartPage";
import { ChangePasswordPage } from "./ChangePasswordPage";
import { ForgotPasswordPage } from "./ForgotPasswordPage";
import { LoginPage } from "./LoginPage";
import { inviteAcceptSchema, loginSchema, registrationStartSchema } from "./authSchemas";

const authApi = vi.hoisted(() => ({
  changePassword: vi.fn(),
  forgotPassword: vi.fn(),
  completeCompanyRegistration: vi.fn(),
  completeJobSeekerRegistration: vi.fn(),
  login: vi.fn(),
  loginVerifyOtp: vi.fn(),
  logout: vi.fn(),
  refreshSession: vi.fn(),
  register: vi.fn(),
  resetPassword: vi.fn(),
  requestOtp: vi.fn(),
  resendOtp: vi.fn(),
  startCompanyRegistration: vi.fn(),
  verifyOtp: vi.fn(),
  verifyRegistrationOtp: vi.fn(),
}));

const inviteApi = vi.hoisted(() => ({
  acceptCompanyInvite: vi.fn(),
  previewCompanyInvite: vi.fn(),
}));

const geoApi = vi.hoisted(() => ({
  listSupportedCountries: vi.fn(),
}));

const usersApi = vi.hoisted(() => ({
  getMe: vi.fn(),
}));

vi.mock("@/shared/api/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/auth")>()),
  completeCompanyRegistration: authApi.completeCompanyRegistration,
  completeJobSeekerRegistration: authApi.completeJobSeekerRegistration,
  changePassword: authApi.changePassword,
  forgotPassword: authApi.forgotPassword,
  login: authApi.login,
  loginVerifyOtp: authApi.loginVerifyOtp,
  logout: authApi.logout,
  refreshSession: authApi.refreshSession,
  register: authApi.register,
  resetPassword: authApi.resetPassword,
  requestOtp: authApi.requestOtp,
  resendOtp: authApi.resendOtp,
  startCompanyRegistration: authApi.startCompanyRegistration,
  verifyOtp: authApi.verifyOtp,
  verifyRegistrationOtp: authApi.verifyRegistrationOtp,
}));

vi.mock("@/shared/api/modules/companyInvites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/companyInvites")>()),
  acceptCompanyInvite: inviteApi.acceptCompanyInvite,
  previewCompanyInvite: inviteApi.previewCompanyInvite,
}));

vi.mock("@/shared/api/modules/geo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/geo")>()),
  listSupportedCountries: geoApi.listSupportedCountries,
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  getMe: usersApi.getMe,
}));

const adminUser = {
  companyId: "company_123",
  email: "admin@cargo.test",
  firstName: "Ada",
  id: "user_123",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
};

const jobSeekerUser = {
  companyId: null,
  email: "job@cargo.test",
  firstName: "Job",
  id: "user_job",
  isActive: true,
  lastName: "Seeker",
  role: "JOB_SEEKER" as const,
};

describe("auth validation", () => {
  it("requires a valid email and an eight-character password", () => {
    expect(loginSchema.safeParse({ email: "bad", password: "short" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "admin@cargo.test", password: "password1" }).success).toBe(true);
  });

  it("validates the company registration account step", () => {
    expect(
      registrationStartSchema.safeParse({
        email: "admin@cargo.test",
        firstName: "Ada",
        lastName: "Admin",
        password: "password1",
        phone: "",
      }).success,
    ).toBe(false);
    expect(
      registrationStartSchema.safeParse({
        email: "admin@cargo.test",
        firstName: "Ada",
        lastName: "Admin",
        password: "password1",
        phone: "+389 70 123 456",
      }).success,
    ).toBe(true);
  });

  it("validates invite accept tokens", () => {
    expect(inviteAcceptSchema.safeParse({ token: "" }).success).toBe(false);
    expect(inviteAcceptSchema.safeParse({ token: "9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a" }).success).toBe(true);
  });
});

describe("protected route", () => {
  beforeEach(() => {
    useAuthStore.setState({ status: "guest", user: null });
  });

  it("redirects guests to login", () => {
    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private workspace</div>} path="/private" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("allows company users through", () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    render(
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Private workspace</div>} path="/private" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Private workspace")).toBeInTheDocument();
  });

  it("allows job seekers through protected routes", () => {
    useAuthStore.setState({ status: "authenticated", user: jobSeekerUser });

    render(
      <MemoryRouter initialEntries={["/job-profile"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Job profile workspace</div>} path="/job-profile" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Job profile workspace")).toBeInTheDocument();
  });

  it("keeps contract routes protected", () => {
    render(
      <MemoryRouter initialEntries={["/contracts"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Contracts workspace</div>} path="/contracts" />
            <Route element={<div>Contract detail</div>} path="/contracts/:contractId" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("keeps company and team admin routes protected", () => {
    render(
      <MemoryRouter initialEntries={["/team/invites"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Company workspace</div>} path="/company" />
            <Route element={<div>Team workspace</div>} path="/team" />
            <Route element={<div>Invite workspace</div>} path="/team/invites" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("keeps fleet routes protected", () => {
    render(
      <MemoryRouter initialEntries={["/fleet/vehicles"]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route element={<div>Fleet overview</div>} path="/fleet" />
            <Route element={<div>Vehicle registry</div>} path="/fleet/vehicles" />
            <Route element={<div>License registry</div>} path="/fleet/licenses" />
            <Route element={<div>Assignment registry</div>} path="/fleet/assignments" />
          </Route>
          <Route element={<div>Login screen</div>} path="/login" />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Login screen")).toBeInTheDocument();
  });

  it("keeps MVP direct routes protected", () => {
    const protectedPaths = [
      "/dashboard",
      "/account/password",
      "/locations",
      "/routes",
      "/posts",
      "/posts/quick",
      "/posts/planned",
      "/contracts",
      "/fleet",
      "/fleet/vehicles",
      "/fleet/licenses",
      "/fleet/assignments",
      "/documents",
      "/notifications",
      "/audit-logs",
      "/reviews",
      "/billing",
      "/company",
      "/team",
      "/release-readiness",
    ];

    for (const path of protectedPaths) {
      const { unmount } = render(
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              {protectedPaths.map((item) => <Route element={<div>Protected page</div>} key={item} path={item} />)}
            </Route>
            <Route element={<div>Login screen</div>} path="/login" />
          </Routes>
        </MemoryRouter>,
      );

      expect(screen.getByText("Login screen")).toBeInTheDocument();
      unmount();
    }
  });
});

describe("change password", () => {
  beforeEach(() => {
    authApi.changePassword.mockResolvedValue({ message: "Password changed" });
  });

  it("changes the signed-in password from a protected account viewport", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ChangePasswordPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText(/current password/i), "password1");
    await userEvent.type(screen.getByLabelText(/^new password/i), "NewPass123!");
    await userEvent.type(screen.getByLabelText(/confirm password/i), "NewPass123!");
    await userEvent.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => {
      expect(authApi.changePassword).toHaveBeenCalledWith({
        currentPassword: "password1",
        newPassword: "NewPass123!",
      });
    });
    expect(await screen.findByRole("heading", { name: /password updated/i })).toBeInTheDocument();
  });
});

describe("registration wizard", () => {
  beforeEach(() => {
    geoApi.listSupportedCountries.mockResolvedValue([
      { code: "MK", name: "North Macedonia" },
      { code: "RS", name: "Serbia" },
      { code: "BG", name: "Bulgaria" },
    ]);
  });

  it("shows useful login placeholders", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByPlaceholderText("you@company.com")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument();
  });

  it("auto-verifies login MFA after six OTP digits", async () => {
    authApi.login.mockResolvedValue({
      challengeId: "challenge_login",
      expiresAt: new Date().toISOString(),
      nextResendAt: new Date(Date.now() - 1_000).toISOString(),
      nextAction: { purpose: "LOGIN_MFA", type: "MFA_REQUIRED" },
      resendAttemptsRemaining: 3,
      user: adminUser,
    });
    authApi.verifyOtp.mockResolvedValue({
      challengeId: "challenge_login",
      channel: "EMAIL",
      nextAction: { type: "VERIFIED" },
      purpose: "LOGIN_MFA",
    });
    authApi.loginVerifyOtp.mockResolvedValue({ user: adminUser });
    usersApi.getMe.mockResolvedValue(adminUser);

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/login"]}>
          <Routes>
            <Route element={<LoginPage />} path="/login" />
            <Route element={<div>Dashboard reached</div>} path="/dashboard" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByPlaceholderText("you@company.com"), "admin@cargo.test");
    await userEvent.type(screen.getByPlaceholderText("Enter your password"), "password1");
    await userEvent.click(screen.getByRole("button", { name: /auth\.login\.submit/i }));

    expect(await screen.findByRole("heading", { name: "Verify your login" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create an account/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /forgot your password/i })).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("OTP code"), "123456");

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge_login", code: "123456" });
    });
    expect(authApi.loginVerifyOtp).toHaveBeenCalledWith({
      email: "admin@cargo.test",
      otpChallengeId: "challenge_login",
      password: "password1",
    });
    expect(await screen.findByText("Dashboard reached")).toBeInTheDocument();
  });

  it("resets password with email OTP and confirmation password", async () => {
    authApi.forgotPassword.mockResolvedValue({
      challengeId: "challenge_12345678",
      code: "123456",
      expiresAt: "",
      message: "If the account exists, an OTP challenge has been generated",
      nextAction: { purpose: "FORGOT_PASSWORD", type: "VERIFY_OTP" },
    });
    authApi.verifyOtp.mockResolvedValue({ challengeId: "challenge_12345678", channel: "EMAIL", nextAction: { type: "VERIFIED" }, purpose: "FORGOT_PASSWORD" });
    authApi.resetPassword.mockResolvedValue({ message: "Password reset successful. Please log in again" });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <ForgotPasswordPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByPlaceholderText("you@company.com"), "job@cargo.test");
    await userEvent.click(screen.getByRole("button", { name: /send reset code/i }));

    expect(await screen.findByText(/local preview code/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("OTP code"), "123456");
    await userEvent.type(screen.getByLabelText("New password"), "NewPass123!");
    await userEvent.type(screen.getByLabelText("Confirm password"), "NewPass123!");
    await userEvent.click(screen.getByRole("button", { name: /reset password/i }));

    expect(authApi.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge_12345678", code: "123456" });
    expect(authApi.resetPassword).toHaveBeenCalledWith({ newPassword: "NewPass123!", otpChallengeId: "challenge_12345678" });
    expect(await screen.findByText("Password updated")).toBeInTheDocument();
  });

  it("starts on the admin account step", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RegistrationStartPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Company admin account" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("ada@carrier.com")).toBeInTheDocument();
    expect(screen.getAllByText("Verification").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /phone.*\+389/i })).toBeInTheDocument();
  });

  it("auto-verifies registration after six OTP digits", async () => {
    authApi.startCompanyRegistration.mockResolvedValue({
      challengeId: "challenge_register",
      draftId: "draft_123",
      expiresAt: new Date().toISOString(),
      nextResendAt: new Date(Date.now() - 1_000).toISOString(),
      nextAction: { purpose: "REGISTER_VERIFY", type: "VERIFY_OTP" },
      resendAttemptsRemaining: 3,
    });
    authApi.resendOtp.mockResolvedValue({
      accepted: true,
      challengeId: "challenge_register",
      expiresAt: new Date().toISOString(),
      nextAction: { purpose: "REGISTER_VERIFY", type: "ENTER_OTP" },
      resendAttemptsRemaining: 2,
    });
    authApi.verifyRegistrationOtp.mockResolvedValue({
      draftId: "draft_123",
      kind: "COMPANY",
      nextAction: { type: "COMPLETE_COMPANY_PROFILE" },
      otpVerified: true,
    });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <RegistrationStartPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.type(screen.getByLabelText(/first name/i), "Ada");
    await userEvent.type(screen.getByLabelText(/last name/i), "Admin");
    await userEvent.type(screen.getByLabelText(/^email/i), "admin@cargo.test");
    await userEvent.type(screen.getByLabelText(/^password/i), "password1");
    await userEvent.click(screen.getByRole("button", { name: /phone.*\+389/i }));
    await userEvent.type(screen.getByPlaceholderText("Search country"), "Serbia");
    await userEvent.click(screen.getByRole("button", { name: /^serbiars$/i }));
    await userEvent.type(screen.getByPlaceholderText("70 123 456"), "60 123 456");
    await userEvent.click(screen.getByRole("button", { name: /send verification/i }));

    expect(authApi.startCompanyRegistration).toHaveBeenCalledWith({
      email: "admin@cargo.test",
      firstName: "Ada",
      kind: "COMPANY",
      lastName: "Admin",
      password: "password1",
      phone: "+381 60 123 456",
    });
    expect(await screen.findByRole("heading", { name: "Verify delivery code" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /resend code/i }));

    expect(authApi.resendOtp).toHaveBeenCalledWith({ challengeId: "challenge_register" });

    await userEvent.type(screen.getByLabelText("OTP code"), "654321");

    await waitFor(() => {
      expect(authApi.verifyRegistrationOtp).toHaveBeenCalledWith({ code: "654321", draftId: "draft_123" });
    });
    expect(await screen.findByRole("heading", { name: "Company profile" })).toBeInTheDocument();
  });
});

describe("invite acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authApi.logout.mockResolvedValue({ message: "Logged out" });
    authApi.refreshSession.mockResolvedValue({ message: "Session refreshed" });
    authApi.register.mockResolvedValue({ user: { ...adminUser, role: "JOB_SEEKER", companyId: null } });
    authApi.requestOtp.mockResolvedValue({
      accepted: true,
      challengeId: "challenge_123",
      expiresAt: new Date().toISOString(),
      nextAction: { purpose: "INVITE_ACCEPT", type: "ENTER_OTP" },
    });
    authApi.verifyOtp.mockResolvedValue({
      challengeId: "challenge_123",
      channel: "EMAIL",
      nextAction: { type: "ACCEPT_INVITE" },
      purpose: "INVITE_ACCEPT",
    });
    inviteApi.acceptCompanyInvite.mockResolvedValue({
      invite: {},
      nextAction: { message: "Refresh", type: "REFRESH_AUTH_SESSION" },
      user: {},
    });
    inviteApi.previewCompanyInvite.mockResolvedValue({
      company: { id: "company_123", name: "Cargo Admin Co" },
      companyId: "company_123",
      expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
      id: "invite_123",
      invitedEmail: "admin@cargo.test",
      status: "PENDING",
      targetRole: "COMPANY_DRIVER",
    });
    usersApi.getMe.mockResolvedValue(adminUser);
  });

  it("shows a missing token state", () => {
    useAuthStore.setState({ status: "guest", user: null });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/invites/accept"]}>
          <InviteAcceptPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Invite link is incomplete" })).toBeInTheDocument();
  });

  it("keeps the invite route public and locks the invited email", async () => {
    useAuthStore.setState({ status: "guest", user: null });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/invites/accept?token=9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a"]}>
          <InviteAcceptPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "Set up your invited account" })).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/invited email/i);
    expect(emailInput).toHaveValue("admin@cargo.test");
    expect(emailInput).toHaveAttribute("readonly");
    expect(screen.getByText(/Cargo Admin Co/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in instead/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send verification code/i })).not.toBeInTheDocument();
  });

  it("creates a password account before showing invite verification", async () => {
    useAuthStore.setState({ status: "guest", user: null });
    usersApi.getMe.mockResolvedValue({ ...adminUser, companyId: null, role: "JOB_SEEKER" });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/invites/accept?token=9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a"]}>
          <InviteAcceptPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByLabelText(/invited email/i)).toHaveValue("admin@cargo.test");
    await userEvent.type(screen.getByLabelText(/first name/i), "Ada");
    await userEvent.type(screen.getByLabelText(/last name/i), "Admin");
    await userEvent.type(screen.getByLabelText(/^password/i), "password1");
    await userEvent.click(screen.getByRole("button", { name: /send account setup code/i }));

    expect(authApi.requestOtp).toHaveBeenCalledWith({
      channel: "EMAIL",
      email: "admin@cargo.test",
      purpose: "REGISTER_VERIFY",
    });

    expect(screen.queryByRole("button", { name: /edit details/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create account/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /verify code/i })).toBeInTheDocument();
    await userEvent.type(await screen.findByLabelText(/account setup otp/i), "123456");

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge_123", code: "123456" });
      expect(authApi.register).toHaveBeenCalledWith({
        email: "admin@cargo.test",
        firstName: "Ada",
        lastName: "Admin",
        otpChallengeId: "challenge_123",
        password: "password1",
        role: "JOB_SEEKER",
      });
    });
    expect(await screen.findByRole("button", { name: /send verification code/i })).toBeInTheDocument();
  });

  it("requests OTP with the authenticated user email", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/invites/accept?token=9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a"]}>
          <InviteAcceptPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: /send verification code/i }));

    expect(authApi.requestOtp).toHaveBeenCalledWith({
      channel: "EMAIL",
      email: "admin@cargo.test",
      purpose: "INVITE_ACCEPT",
    });
    expect(await screen.findByRole("heading", { name: "Enter invite OTP" })).toBeInTheDocument();
  });

  it("accepts only after OTP verification", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/invites/accept?token=9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a"]}>
          <InviteAcceptPage />
          <Routes>
            <Route element={<div>Dashboard reached</div>} path="/dashboard" />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole("button", { name: /send verification code/i }));
    await userEvent.type(await screen.findByLabelText(/otp code/i), "123456");

    await waitFor(() => {
      expect(authApi.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge_123", code: "123456" });
      expect(inviteApi.acceptCompanyInvite).toHaveBeenCalledWith({
        otpChallengeId: "challenge_123",
        token: "9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a",
      });
    });
    expect(usersApi.getMe).toHaveBeenCalled();
    expect(await screen.findByText("Dashboard reached")).toBeInTheDocument();
  });
});


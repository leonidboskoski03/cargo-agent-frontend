import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, beforeEach, vi } from "vitest";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { useAuthStore } from "@/features/auth/authStore";
import { InviteAcceptPage } from "@/features/invites/InviteAcceptPage";
import { RegistrationStartPage } from "@/features/registration/RegistrationStartPage";
import { LoginPage } from "./LoginPage";
import { inviteAcceptSchema, loginSchema, registrationStartSchema } from "./authSchemas";

const authApi = vi.hoisted(() => ({
  logout: vi.fn(),
  refreshSession: vi.fn(),
  register: vi.fn(),
  requestOtp: vi.fn(),
  resendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

const inviteApi = vi.hoisted(() => ({
  acceptCompanyInvite: vi.fn(),
}));

const usersApi = vi.hoisted(() => ({
  getMe: vi.fn(),
}));

vi.mock("@/shared/api/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/auth")>()),
  logout: authApi.logout,
  refreshSession: authApi.refreshSession,
  register: authApi.register,
  requestOtp: authApi.requestOtp,
  resendOtp: authApi.resendOtp,
  verifyOtp: authApi.verifyOtp,
}));

vi.mock("@/shared/api/modules/companyInvites", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/companyInvites")>()),
  acceptCompanyInvite: inviteApi.acceptCompanyInvite,
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

describe("registration wizard", () => {
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

  it("starts on the admin account step", () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <RegistrationStartPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Admin account" })).toBeInTheDocument();
    expect(screen.getByText("Verification")).toBeInTheDocument();
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

  it("keeps the invite route public and lets guests set up a password", () => {
    useAuthStore.setState({ status: "guest", user: null });

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={["/invites/accept?token=9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a"]}>
          <InviteAcceptPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByRole("heading", { name: "Set up your invited account" })).toBeInTheDocument();
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

    await userEvent.type(screen.getByLabelText(/invited email/i), "admin@cargo.test");
    await userEvent.type(screen.getByLabelText(/first name/i), "Ada");
    await userEvent.type(screen.getByLabelText(/last name/i), "Admin");
    await userEvent.type(screen.getByLabelText(/^password/i), "password1");
    await userEvent.click(screen.getByRole("button", { name: /send account setup code/i }));

    expect(authApi.requestOtp).toHaveBeenCalledWith({
      channel: "EMAIL",
      email: "admin@cargo.test",
      purpose: "REGISTER_VERIFY",
    });

    await userEvent.type(await screen.findByLabelText(/account setup otp/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /create account/i }));

    expect(authApi.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge_123", code: "123456" });
    expect(authApi.register).toHaveBeenCalledWith({
      email: "admin@cargo.test",
      firstName: "Ada",
      lastName: "Admin",
      otpChallengeId: "challenge_123",
      password: "password1",
      role: "JOB_SEEKER",
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

    await userEvent.click(screen.getByRole("button", { name: /send verification code/i }));

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

    await userEvent.click(screen.getByRole("button", { name: /send verification code/i }));
    await userEvent.type(await screen.findByLabelText(/otp code/i), "123456");
    await userEvent.click(screen.getByRole("button", { name: /accept invite/i }));

    expect(authApi.verifyOtp).toHaveBeenCalledWith({ challengeId: "challenge_123", code: "123456" });
    expect(inviteApi.acceptCompanyInvite).toHaveBeenCalledWith({
      otpChallengeId: "challenge_123",
      token: "9fd823c82cbe7aa447807e73f80f35c4eacb814226c5758a",
    });
    expect(usersApi.getMe).toHaveBeenCalled();
    expect(await screen.findByText("Dashboard reached")).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { languageStorageKey } from "@/shared/i18n";
import { useUiStore } from "@/shared/stores/uiStore";
import { AppShell } from "./AppShell";

const localizationApi = vi.hoisted(() => ({ listSupportedLanguages: vi.fn() }));
const notificationsApi = vi.hoisted(() => ({ listNotifications: vi.fn() }));
const companyCreditsApi = vi.hoisted(() => ({ getCompanyCreditWallet: vi.fn() }));
const jobSeekerBillingApi = vi.hoisted(() => ({ getJobSeekerWallet: vi.fn() }));
const authApi = vi.hoisted(() => ({ logout: vi.fn() }));
const usersApi = vi.hoisted(() => ({ updateMyUser: vi.fn() }));

vi.mock("@/shared/api/modules/localization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/localization")>()),
  listSupportedLanguages: localizationApi.listSupportedLanguages,
}));

vi.mock("@/shared/api/modules/notifications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/notifications")>()),
  listNotifications: notificationsApi.listNotifications,
}));

vi.mock("@/shared/api/modules/companyCredits", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/companyCredits")>()),
  getCompanyCreditWallet: companyCreditsApi.getCompanyCreditWallet,
}));

vi.mock("@/shared/api/modules/jobSeekerBilling", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/jobSeekerBilling")>()),
  getJobSeekerWallet: jobSeekerBillingApi.getJobSeekerWallet,
}));

vi.mock("@/shared/api/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/auth")>()),
  logout: authApi.logout,
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  updateMyUser: usersApi.updateMyUser,
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

const driverUser = {
  ...adminUser,
  email: "driver@cargo.test",
  id: "user_driver",
  role: "COMPANY_DRIVER" as const,
};

const jobSeekerUser = {
  ...adminUser,
  companyId: null,
  email: "seeker@cargo.test",
  id: "user_seeker",
  role: "JOB_SEEKER" as const,
};

function renderShell(initialPath = "/dashboard") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AppShell />} path="/*">
            <Route element={<div>Workspace route</div>} path="*" />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function closePinnedSidebarIfOpen() {
  const unpinButton = screen.queryByRole("button", { name: "Unpin sidebar" });
  if (!unpinButton) return;
  await userEvent.click(unpinButton);
  await waitFor(() => expect(screen.queryByTestId("secondary-nav-panel")).not.toBeInTheDocument());
}

async function pinSidebarIfClosed() {
  const pinButton = screen.queryByRole("button", { name: "Pin sidebar" });
  if (pinButton) await userEvent.click(pinButton);
}

describe("AppShell navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    localizationApi.listSupportedLanguages.mockResolvedValue([{ code: "en", label: "English", nativeName: "English" }]);
    notificationsApi.listNotifications.mockResolvedValue([]);
    companyCreditsApi.getCompanyCreditWallet.mockResolvedValue({ balanceCredits: 12, companyId: adminUser.companyId, updatedAt: "" });
    jobSeekerBillingApi.getJobSeekerWallet.mockResolvedValue({ balanceCredits: 4, updatedAt: "", userId: jobSeekerUser.id });
    authApi.logout.mockResolvedValue({});
    usersApi.updateMyUser.mockImplementation((input) => Promise.resolve({ ...adminUser, preferredLanguage: input.preferredLanguage }));
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    useUiStore.setState({ activeNavSectionId: "home", secondaryPanelOpen: false, sidebarOpen: false });
  });

  it("syncs direct fleet license routes into the rail and opens the fleet panel when pinned", async () => {
    renderShell("/fleet/licenses");
    await closePinnedSidebarIfOpen();

    expect(screen.queryByTestId("secondary-nav-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Fleet" })).toHaveAttribute("aria-current", "page");

    await pinSidebarIfClosed();

    expect(await screen.findByRole("heading", { name: "Fleet" })).toBeInTheDocument();
    const panel = screen.getByTestId("secondary-nav-panel");
    expect(within(panel).getByRole("link", { name: /Licenses/i })).toBeInTheDocument();
  });

  it("opens a clicked rail section and keeps the panel open", async () => {
    renderShell("/dashboard");

    await pinSidebarIfClosed();
    await userEvent.click(screen.getByRole("button", { name: "Open Planning" }));

    expect(await screen.findByRole("heading", { name: "Planning" })).toBeInTheDocument();
    expect(screen.getByTestId("secondary-nav-panel")).toBeInTheDocument();
    expect(screen.getByText("Workspace route")).toBeInTheDocument();
  });

  it("closes the secondary panel while leaving the dark rail available", async () => {
    renderShell("/dashboard");

    await userEvent.click(screen.getByRole("button", { name: "Pin sidebar" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Close sidebar" })[0]);

    expect(screen.queryByTestId("secondary-nav-panel")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Planning" })).toBeInTheDocument();
  });

  it("filters secondary panel shortcuts with an empty state", async () => {
    renderShell("/fleet");

    await userEvent.click(screen.getByRole("button", { name: "Pin sidebar" }));
    await userEvent.click(await screen.findByRole("button", { name: "Search sidebar" }));
    const searchInput = await screen.findByRole("textbox", { name: "Search sidebar" });
    fireEvent.change(searchInput, { target: { value: "licenses" } });

    const panel = screen.getByTestId("secondary-nav-panel");
    expect(within(panel).getByRole("link", { name: /Licenses/i })).toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: /Vehicles/i })).not.toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: "does not exist" } });

    expect(within(panel).getByText("No matching shortcuts")).toBeInTheDocument();
  });

  it("hides admin-only secondary items from drivers", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderShell("/company");
    await userEvent.click(screen.getByRole("button", { name: "Pin sidebar" }));

    const panel = await screen.findByTestId("secondary-nav-panel");
    expect(within(panel).getByRole("link", { name: /Company/i })).toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: /Team/i })).not.toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: /Audit logs/i })).not.toBeInTheDocument();
  });

  it("keeps audit logs admin-only and release readiness out of product navigation", async () => {
    renderShell("/company");
    await userEvent.click(screen.getByRole("button", { name: "Pin sidebar" }));

    const panel = await screen.findByTestId("secondary-nav-panel");
    expect(within(panel).getByRole("link", { name: /Audit logs/i })).toHaveAttribute("href", "/audit-logs");
    expect(within(panel).queryByRole("link", { name: /Release readiness/i })).not.toBeInTheDocument();
  });

  it("limits company driver sidebar to planning, company posts, and company", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderShell("/posts/mine");
    await userEvent.click(screen.getByRole("button", { name: "Pin sidebar" }));

    expect(screen.getByRole("button", { name: "Open Planning" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Posts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open Company" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Home" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Fleet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Reviews" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open More" })).not.toBeInTheDocument();

    const panel = await screen.findByTestId("secondary-nav-panel");
    expect(within(panel).getByRole("link", { name: /Company posts/i })).toHaveAttribute("href", "/posts/mine");
    expect(within(panel).queryByRole("link", { name: /Quick route post/i })).not.toBeInTheDocument();
    expect(within(panel).queryByRole("link", { name: /Marketplace/i })).not.toBeInTheDocument();
  });

  it("shows job seeker navigation without company-only fleet links", async () => {
    useAuthStore.setState({ status: "authenticated", user: jobSeekerUser });

    renderShell("/jobs");
    await userEvent.click(screen.getByRole("button", { name: "Pin sidebar" }));

    expect(screen.getByRole("button", { name: "Open Jobs" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("button", { name: "Open Fleet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Open Company" })).not.toBeInTheDocument();

    const panel = await screen.findByTestId("secondary-nav-panel");
    expect(within(panel).getByRole("link", { name: /My listings/i })).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /Job wallet/i })).toBeInTheDocument();
  });

  it("shows a compact company wallet and account controls in the header", async () => {
    renderShell("/dashboard");

    expect(await screen.findByRole("link", { name: /company credits: 12 credits/i })).toHaveAttribute("href", "/company-credits");
    await userEvent.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.queryByRole("link", { name: /Company settings/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Change password/i })).toHaveAttribute("href", "/account/password");
    await userEvent.click(screen.getByRole("button", { name: /Log out/i }));

    expect(authApi.logout).toHaveBeenCalled();
  });

  it("keeps job seeker profile in the account menu with a job wallet shortcut", async () => {
    useAuthStore.setState({ status: "authenticated", user: jobSeekerUser });

    renderShell("/jobs");

    expect(await screen.findByRole("link", { name: /job wallet: 4 credits/i })).toHaveAttribute("href", "/job-wallet");
    await userEvent.click(screen.getByRole("button", { name: "Open account menu" }));

    expect(screen.getByRole("link", { name: /^Profile$/i })).toHaveAttribute("href", "/job-profile");
  });

  it("persists selected language in browser storage and user profile", async () => {
    localizationApi.listSupportedLanguages.mockResolvedValue([
      { code: "en", label: "English", nativeName: "English" },
      { code: "mk", label: "Macedonian", nativeName: "Macedonian" },
    ]);

    renderShell("/dashboard");

    await userEvent.click(screen.getByRole("button", { name: /change language/i }));
    await userEvent.click(await screen.findByRole("button", { name: /Macedonian/i }));

    expect(window.localStorage.getItem(languageStorageKey)).toBe("mk");
    await waitFor(() => expect(usersApi.updateMyUser.mock.calls.at(-1)?.[0]).toEqual({ preferredLanguage: "mk" }));
  });

  it("renders grouped navigation inside the mobile drawer", async () => {
    renderShell("/dashboard");

    await userEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    const drawer = screen.getByTestId("mobile-nav-drawer");
    expect(within(drawer).getByText("Planning")).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: /Locations/i })).toBeInTheDocument();
    expect(within(drawer).getByRole("link", { name: /Quick route post/i })).toBeInTheDocument();
  });

  it("previews a secondary panel on rail hover and hides it after leaving", async () => {
    renderShell("/dashboard");

    const planningButton = screen.getByRole("button", { name: "Open Planning" });
    await userEvent.hover(planningButton);

    const panel = await screen.findByTestId("secondary-nav-panel");
    expect(within(panel).getByText("Planning")).toBeInTheDocument();
    expect(within(panel).getByRole("link", { name: /Locations/i })).toBeInTheDocument();

    await userEvent.unhover(planningButton);

    await waitFor(() => expect(screen.queryByTestId("secondary-nav-panel")).not.toBeInTheDocument());
  });
});

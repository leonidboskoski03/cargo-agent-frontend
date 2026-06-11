import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { useUiStore } from "@/shared/stores/uiStore";
import { AppShell } from "./AppShell";

const localizationApi = vi.hoisted(() => ({ listSupportedLanguages: vi.fn() }));
const notificationsApi = vi.hoisted(() => ({ listNotifications: vi.fn() }));
const authApi = vi.hoisted(() => ({ logout: vi.fn() }));

vi.mock("@/shared/api/modules/localization", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/localization")>()),
  listSupportedLanguages: localizationApi.listSupportedLanguages,
}));

vi.mock("@/shared/api/modules/notifications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/notifications")>()),
  listNotifications: notificationsApi.listNotifications,
}));

vi.mock("@/shared/api/modules/auth", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/auth")>()),
  logout: authApi.logout,
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
    localizationApi.listSupportedLanguages.mockResolvedValue([{ code: "en", label: "English", nativeName: "English" }]);
    notificationsApi.listNotifications.mockResolvedValue([]);
    authApi.logout.mockResolvedValue({});
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
    const searchInput = await screen.findByLabelText("Search sidebar");
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

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { TeamPage } from "./TeamPage";

const usersApi = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  listUsers: vi.fn(),
  restoreUser: vi.fn(),
  updateUserMembership: vi.fn(),
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  deleteUser: usersApi.deleteUser,
  listUsers: usersApi.listUsers,
  restoreUser: usersApi.restoreUser,
  updateUserMembership: usersApi.updateUserMembership,
}));

const adminUser = {
  companyId: "company_1",
  email: "admin@cargo.test",
  firstName: "Ana",
  id: "user_admin",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <TeamPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("TeamPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    usersApi.deleteUser.mockResolvedValue({});
    usersApi.restoreUser.mockResolvedValue({});
    usersApi.updateUserMembership.mockResolvedValue({});
  });

  it("splits active and deleted team users into dedicated admin views", async () => {
    const activeDriver = {
      ...adminUser,
      deletedAt: null,
      email: "driver@cargo.test",
      firstName: "Dina",
      id: "user_driver",
      lastName: "Driver",
      role: "COMPANY_DRIVER" as const,
    };
    const deletedDriver = {
      ...activeDriver,
      deletedAt: "2026-06-13T00:00:00.000Z",
      email: "deleted@cargo.test",
      firstName: "Del",
      id: "user_deleted",
      isActive: false,
      lastName: "Deleted",
    };
    usersApi.listUsers.mockImplementation((params) => Promise.resolve(params?.deleted === "only" ? [deletedDriver] : [activeDriver]));

    renderPage();

    expect(await screen.findByText("Dina Driver")).toBeInTheDocument();
    expect(usersApi.listUsers).toHaveBeenCalledWith({ deleted: "active", includeInactive: false });
    expect(screen.queryByText("Del Deleted")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("Del Deleted")).toBeInTheDocument();
    expect(usersApi.listUsers).toHaveBeenCalledWith({ deleted: "only", includeInactive: true });
    expect(screen.queryByText("Dina Driver")).not.toBeInTheDocument();
    expect(screen.getByText("DELETED")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^delete$/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /restore/i }));
    expect(usersApi.restoreUser).toHaveBeenCalledWith("user_deleted", expect.anything());
  });
});

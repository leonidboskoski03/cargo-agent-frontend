import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { FleetVehiclesPage } from "./FleetVehiclesPage";

const vehicleApi = vi.hoisted(() => ({
  createVehicle: vi.fn(),
  deleteVehicle: vi.fn(),
  listVehicles: vi.fn(),
  restoreVehicle: vi.fn(),
  updateVehicle: vi.fn(),
}));

vi.mock("@/shared/api/modules/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicles")>()),
  createVehicle: vehicleApi.createVehicle,
  deleteVehicle: vehicleApi.deleteVehicle,
  listVehicles: vehicleApi.listVehicles,
  restoreVehicle: vehicleApi.restoreVehicle,
  updateVehicle: vehicleApi.updateVehicle,
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

function renderWithQuery() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <FleetVehiclesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("fleet pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vehicleApi.listVehicles.mockResolvedValue([]);
  });

  it("shows vehicle mutation controls to admins", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    renderWithQuery();

    expect(await screen.findByRole("heading", { name: "Add vehicle" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /add vehicle/i })).toBeInTheDocument();
  });

  it("keeps drivers in read-only vehicle mode", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderWithQuery();

    expect(await screen.findByRole("heading", { name: "Read-only vehicle view" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /add vehicle/i })).not.toBeInTheDocument();
  });
});

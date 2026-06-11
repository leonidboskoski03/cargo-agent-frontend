import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { VehicleMarketplaceMinePage } from "./VehicleMarketplaceMinePage";

const vehicleMarketplaceApi = vi.hoisted(() => ({
  deleteVehicleMarketplaceListing: vi.fn(),
  listMyVehicleMarketplaceListings: vi.fn(),
  restoreVehicleMarketplaceListing: vi.fn(),
  updateVehicleMarketplaceListing: vi.fn(),
}));

vi.mock("@/shared/api/modules/vehicleMarketplace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicleMarketplace")>()),
  deleteVehicleMarketplaceListing: vehicleMarketplaceApi.deleteVehicleMarketplaceListing,
  listMyVehicleMarketplaceListings: vehicleMarketplaceApi.listMyVehicleMarketplaceListings,
  restoreVehicleMarketplaceListing: vehicleMarketplaceApi.restoreVehicleMarketplaceListing,
  updateVehicleMarketplaceListing: vehicleMarketplaceApi.updateVehicleMarketplaceListing,
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <VehicleMarketplaceMinePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("VehicleMarketplaceMinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: {
        companyId: "company_1",
        email: "admin@test.local",
        firstName: "Admin",
        id: "user_admin",
        isActive: true,
        lastName: "User",
        role: "COMPANY_ADMIN",
      },
    });
    vehicleMarketplaceApi.listMyVehicleMarketplaceListings.mockResolvedValue([
      {
        city: "Skopje",
        countryCode: "MK",
        createdAt: "",
        deletedAt: "2026-06-07T12:00:00.000Z",
        id: "listing_deleted",
        intent: "SALE",
        ownerCompanyId: "company_1",
        sourceType: "STANDALONE",
        status: "CLOSED",
        title: "Deleted trailer listing",
        updatedAt: "",
        vehicleType: "TRAILER",
      },
    ]);
  });

  it("loads owned deleted listings and shows restore action", async () => {
    renderPage();

    expect(await screen.findByText("Deleted trailer listing")).toBeInTheDocument();
    expect(vehicleMarketplaceApi.listMyVehicleMarketplaceListings).toHaveBeenCalledWith({ includeDeleted: true });
    expect(screen.getByText("Deleted")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /restore/i })).toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
        deletedAt: null,
        id: "listing_active",
        intent: "RENTAL",
        ownerCompanyId: "company_1",
        sourceType: "STANDALONE",
        status: "PUBLISHED",
        title: "Active truck listing",
        updatedAt: "",
        vehicleType: "TRUCK",
      },
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
    vehicleMarketplaceApi.restoreVehicleMarketplaceListing.mockResolvedValue({});
    vi.spyOn(window, "confirm").mockReturnValue(true);
  });

  it("splits active and deleted owned listings into dedicated views", async () => {
    renderPage();

    expect(await screen.findByText("Active truck listing")).toBeInTheDocument();
    expect(screen.queryByText("Deleted trailer listing")).not.toBeInTheDocument();
    expect(vehicleMarketplaceApi.listMyVehicleMarketplaceListings).toHaveBeenCalledWith({ includeDeleted: true });
    expect(screen.getByRole("button", { name: /active 1/i })).toHaveAttribute("aria-pressed", "true");

    await userEvent.click(screen.getByRole("button", { name: /deleted 1/i }));

    expect(await screen.findByText("Deleted trailer listing")).toBeInTheDocument();
    expect(screen.queryByText("Active truck listing")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /restore/i }));

    expect(vehicleMarketplaceApi.restoreVehicleMarketplaceListing).toHaveBeenCalledWith("listing_deleted", expect.anything());
  });
});

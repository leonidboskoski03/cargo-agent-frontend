import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { VehicleMarketplacePage } from "./VehicleMarketplacePage";

const vehicleMarketplaceApi = vi.hoisted(() => ({
  listVehicleMarketplaceListings: vi.fn(),
}));

vi.mock("@/shared/api/modules/vehicleMarketplace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicleMarketplace")>()),
  listVehicleMarketplaceListings: vehicleMarketplaceApi.listVehicleMarketplaceListings,
}));

const adminUser = {
  companyId: "company_1",
  email: "admin@test.local",
  firstName: "Admin",
  id: "user_admin",
  isActive: true,
  lastName: "User",
  role: "COMPANY_ADMIN" as const,
};

const driverUser = {
  ...adminUser,
  email: "driver@test.local",
  id: "user_driver",
  role: "COMPANY_DRIVER" as const,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <VehicleMarketplacePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("VehicleMarketplacePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vehicleMarketplaceApi.listVehicleMarketplaceListings.mockResolvedValue([
      {
        city: "Skopje",
        countryCode: "MK",
        createdAt: "",
        currency: "EUR",
        description: "Regional rental ready truck.",
        hazmatCertified: true,
        id: "listing_1",
        intent: "RENTAL",
        ownerCompany: { city: "Skopje", countryCode: "MK", id: "company_1", name: "Cargo Co" },
        ownerCompanyId: "company_1",
        priceAmount: "900",
        refrigerated: false,
        sourceType: "FLEET_VEHICLE",
        status: "PUBLISHED",
        title: "MAN TGX for rent",
        updatedAt: "",
        vehicleType: "TRUCK",
        year: 2023,
      },
    ]);
  });

  it("renders readable listing data and sends filters to the API", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    renderPage();

    expect(await screen.findByText("MAN TGX for rent")).toBeInTheDocument();
    expect(screen.getAllByText("Rental").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: /create listing/i })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search"), "m");
    expect(vehicleMarketplaceApi.listVehicleMarketplaceListings).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole("button", { name: /apply/i }));
    await waitFor(() => {
      expect(vehicleMarketplaceApi.listVehicleMarketplaceListings).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "m" }),
      );
    });
  });

  it("hides create controls for company drivers", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });
    renderPage();

    expect(await screen.findByText("MAN TGX for rent")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /create listing/i })).not.toBeInTheDocument();
  });
});

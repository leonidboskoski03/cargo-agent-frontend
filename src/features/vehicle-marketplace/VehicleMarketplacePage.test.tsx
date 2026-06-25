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
        capacityKg: 12000,
        city: "Skopje",
        countryCode: "MK",
        createdAt: "2026-06-14T10:00:00.000Z",
        currency: "EUR",
        description: "Regional rental ready truck.",
        hazmatCertified: true,
        id: "listing_1",
        intent: "RENTAL",
        ownerCompany: { city: "Skopje", countryCode: "MK", id: "company_1", name: "Cargo Co" },
        ownerCompanyId: "company_1",
        priceAmount: "900",
        isRegistered: true,
        registrationExpiresAt: "2027-05-20T00:00:00.000Z",
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
    expect(screen.getAllByText(/Rental/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Seller")).toBeInTheDocument();
    expect(screen.getByText("Price")).toBeInTheDocument();
    expect(screen.getByText("Vehicle")).toBeInTheDocument();
    expect(screen.getByText("Registration")).toBeInTheDocument();
    expect(screen.getByText("Registered until 2027-05-20")).toBeInTheDocument();
    expect(screen.getAllByText("Cargo Co").length).toBeGreaterThan(0);
    expect(screen.getByText(/listed 2026-06-14/i)).toBeInTheDocument();
    expect(screen.queryByText("12000 kg")).not.toBeInTheDocument();
    expect(screen.queryByText("Refrigerated")).not.toBeInTheDocument();
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

  it("opens detailed filters in the shared popover", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    renderPage();

    expect(await screen.findByText("MAN TGX for rent")).toBeInTheDocument();
    expect(screen.queryByLabelText(/price min/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(await screen.findByRole("dialog", { name: /vehicle filters/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/price min/i), "700");
    await userEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => {
      expect(vehicleMarketplaceApi.listVehicleMarketplaceListings).toHaveBeenLastCalledWith(
        expect.objectContaining({ priceMin: 700 }),
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

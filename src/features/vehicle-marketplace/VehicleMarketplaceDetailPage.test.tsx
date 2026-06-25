import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { VehicleMarketplaceDetailPage } from "./VehicleMarketplaceDetailPage";

const vehicleMarketplaceApi = vi.hoisted(() => ({
  createVehicleMarketplaceInquiry: vi.fn(),
  deleteVehicleMarketplaceListing: vi.fn(),
  getVehicleMarketplaceListing: vi.fn(),
  updateVehicleMarketplaceListing: vi.fn(),
}));

vi.mock("@/shared/api/modules/vehicleMarketplace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicleMarketplace")>()),
  createVehicleMarketplaceInquiry: vehicleMarketplaceApi.createVehicleMarketplaceInquiry,
  deleteVehicleMarketplaceListing: vehicleMarketplaceApi.deleteVehicleMarketplaceListing,
  getVehicleMarketplaceListing: vehicleMarketplaceApi.getVehicleMarketplaceListing,
  updateVehicleMarketplaceListing: vehicleMarketplaceApi.updateVehicleMarketplaceListing,
}));

const adminUser = {
  companyId: "company_buyer",
  email: "buyer@test.local",
  firstName: "Buyer",
  id: "user_buyer",
  isActive: true,
  lastName: "User",
  role: "COMPANY_ADMIN" as const,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/vehicle-marketplace/listing_1"]}>
        <Routes>
          <Route element={<VehicleMarketplaceDetailPage />} path="/vehicle-marketplace/:listingId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("VehicleMarketplaceDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    vehicleMarketplaceApi.getVehicleMarketplaceListing.mockResolvedValue({
      brand: "MAN",
      city: "Skopje",
      countryCode: "MK",
      createdAt: "2026-06-14T10:00:00.000Z",
      currency: "EUR",
      description: "Regional rental ready truck.",
      id: "listing_1",
      intent: "RENTAL",
      model: "TGX",
      ownerCompany: { city: "Skopje", countryCode: "MK", id: "company_seller", name: "Cargo Co" },
      ownerCompanyId: "company_seller",
      ownerUserId: null,
      priceAmount: "900",
      isRegistered: true,
      registrationExpiresAt: "2027-05-20T00:00:00.000Z",
      sourceType: "STANDALONE",
      status: "PUBLISHED",
      title: "MAN TGX for rent",
      updatedAt: "2026-06-14T10:00:00.000Z",
      vehicleType: "TRUCK",
      year: 2023,
    });
    vehicleMarketplaceApi.createVehicleMarketplaceInquiry.mockResolvedValue({});
  });

  it("shows seller-first vehicle information and sends inquiry without contact email", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Vehicle information" })).toBeInTheDocument();
    expect(screen.getByText("Seller")).toBeInTheDocument();
    expect(screen.getByText("Cargo Co")).toBeInTheDocument();
    expect(screen.getByText("Registered until 2027-05-20")).toBeInTheDocument();
    expect(screen.queryByLabelText(/contact email/i)).not.toBeInTheDocument();

    await userEvent.type(screen.getByPlaceholderText("Is this truck available next month?"), "Is this truck available next month?");
    await userEvent.click(screen.getByRole("button", { name: /send inquiry/i }));

    await waitFor(() => {
      expect(vehicleMarketplaceApi.createVehicleMarketplaceInquiry).toHaveBeenCalledWith("listing_1", {
        message: "Is this truck available next month?",
      });
    });
  });
});

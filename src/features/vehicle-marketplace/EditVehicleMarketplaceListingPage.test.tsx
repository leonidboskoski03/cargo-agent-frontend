import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { EditVehicleMarketplaceListingPage } from "./EditVehicleMarketplaceListingPage";

const geoApi = vi.hoisted(() => ({
  listSupportedCountries: vi.fn(),
}));

const vehicleMarketplaceApi = vi.hoisted(() => ({
  getVehicleMarketplaceListing: vi.fn(),
  updateVehicleMarketplaceListing: vi.fn(),
}));

vi.mock("@/shared/api/modules/geo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/geo")>()),
  listSupportedCountries: geoApi.listSupportedCountries,
}));

vi.mock("@/shared/api/modules/vehicleMarketplace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicleMarketplace")>()),
  getVehicleMarketplaceListing: vehicleMarketplaceApi.getVehicleMarketplaceListing,
  updateVehicleMarketplaceListing: vehicleMarketplaceApi.updateVehicleMarketplaceListing,
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/vehicle-marketplace/listing_1/edit"]}>
        <Routes>
          <Route element={<EditVehicleMarketplaceListingPage />} path="/vehicle-marketplace/:listingId/edit" />
          <Route element={<div>Saved listing</div>} path="/vehicle-marketplace/:listingId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EditVehicleMarketplaceListingPage", () => {
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
    geoApi.listSupportedCountries.mockResolvedValue([{ code: "MK", name: "North Macedonia" }]);
    vehicleMarketplaceApi.getVehicleMarketplaceListing.mockResolvedValue({
      bodyType: "BOX",
      brand: "MAN",
      capacityKg: 12000,
      city: "Skopje",
      countryCode: "MK",
      createdAt: "",
      currency: "EUR",
      description: "Original description",
      hazmatCertified: true,
      id: "listing_1",
      intent: "RENTAL",
      model: "TGX",
      ownerCompanyId: "company_1",
      priceAmount: "900",
      isRegistered: true,
      registrationExpiresAt: "2027-05-20T00:00:00.000Z",
      refrigerated: false,
      sourceType: "STANDALONE",
      status: "PUBLISHED",
      title: "MAN TGX for rent",
      updatedAt: "",
      vehicleType: "TRUCK",
      volumeM3: "45.5",
      year: 2023,
    });
    vehicleMarketplaceApi.updateVehicleMarketplaceListing.mockResolvedValue({
      id: "listing_1",
      title: "MAN TGX edited",
    });
  });

  it("loads owner listing values and submits an update payload", async () => {
    renderPage();

    const title = await screen.findByDisplayValue("MAN TGX for rent");
    expect(screen.queryByLabelText("Body type")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Capacity kg")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Volume m3")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Refrigerated")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hazmat certified")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Price type")).toHaveValue("FIXED");
    expect(screen.getByLabelText("Price amount")).toHaveValue("900");
    expect(screen.getByLabelText("Registration status")).toHaveValue("REGISTERED");
    expect(screen.getByLabelText("Registration expiry date")).toHaveValue("2027-05-20");
    expect(screen.getByLabelText("Currency")).toBeInTheDocument();
    await userEvent.clear(title);
    await userEvent.type(title, "MAN TGX edited");
    await userEvent.click(screen.getByRole("button", { name: /save listing/i }));

    await waitFor(() => {
      expect(vehicleMarketplaceApi.updateVehicleMarketplaceListing).toHaveBeenCalledWith(
        "listing_1",
        expect.objectContaining({
          city: "Skopje",
          countryCode: "MK",
          isRegistered: true,
          registrationExpiresAt: "2027-05-20",
          status: "PUBLISHED",
          title: "MAN TGX edited",
        }),
      );
      const payload = vehicleMarketplaceApi.updateVehicleMarketplaceListing.mock.calls[0][1];
      expect(payload).not.toHaveProperty("bodyType");
      expect(payload).not.toHaveProperty("capacityKg");
      expect(payload).not.toHaveProperty("volumeM3");
      expect(payload).not.toHaveProperty("refrigerated");
      expect(payload).not.toHaveProperty("hazmatCertified");
    });
  });

  it("clears existing price fields when listing is changed to negotiable", async () => {
    renderPage();

    await screen.findByDisplayValue("MAN TGX for rent");
    await userEvent.selectOptions(screen.getByLabelText("Registration status"), "UNREGISTERED");
    await userEvent.selectOptions(screen.getByLabelText("Price type"), "NEGOTIABLE");

    expect(screen.queryByLabelText("Registration expiry date")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Price amount")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Currency")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /save listing/i }));

    await waitFor(() => {
      expect(vehicleMarketplaceApi.updateVehicleMarketplaceListing).toHaveBeenCalledWith(
        "listing_1",
        expect.objectContaining({
          currency: null,
          isRegistered: false,
          priceAmount: null,
          registrationExpiresAt: null,
        }),
      );
    });
  });
});

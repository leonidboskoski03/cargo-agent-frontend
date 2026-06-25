import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { NewVehicleMarketplaceListingPage } from "./NewVehicleMarketplaceListingPage";

const geoApi = vi.hoisted(() => ({
  listSupportedCountries: vi.fn(),
}));

const vehiclesApi = vi.hoisted(() => ({
  listVehicles: vi.fn(),
}));

const vehicleMarketplaceApi = vi.hoisted(() => ({
  createVehicleMarketplaceListing: vi.fn(),
}));

vi.mock("@/shared/api/modules/geo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/geo")>()),
  listSupportedCountries: geoApi.listSupportedCountries,
}));

vi.mock("@/shared/api/modules/vehicles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicles")>()),
  listVehicles: vehiclesApi.listVehicles,
}));

vi.mock("@/shared/api/modules/vehicleMarketplace", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/vehicleMarketplace")>()),
  createVehicleMarketplaceListing: vehicleMarketplaceApi.createVehicleMarketplaceListing,
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/vehicle-marketplace/new"]}>
        <Routes>
          <Route element={<NewVehicleMarketplaceListingPage />} path="/vehicle-marketplace/new" />
          <Route element={<div>Created listing</div>} path="/vehicle-marketplace/:listingId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("NewVehicleMarketplaceListingPage", () => {
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
    vehiclesApi.listVehicles.mockResolvedValue([]);
    vehicleMarketplaceApi.createVehicleMarketplaceListing.mockResolvedValue({ id: "listing_new", title: "MAN TGX for rent" });
  });

  it("creates draft listings without removed spec fields", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Create vehicle listing" })).toBeInTheDocument();
    expect(screen.getByText("New listings are saved as drafts first.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Body type")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Capacity kg")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Volume m3")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Refrigerated")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Hazmat certified")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Publish state")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/registration status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/registration expiry date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/price amount/i)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/title/i), "MAN TGX for rent");
    await userEvent.type(screen.getByLabelText(/city/i), "Skopje");
    await userEvent.selectOptions(screen.getByLabelText(/currency/i), "BGN");
    await userEvent.type(screen.getByLabelText(/price amount/i), "18000");
    await userEvent.type(screen.getByLabelText(/registration expiry date/i), "2027-05-20");
    await userEvent.type(screen.getByLabelText(/description/i), "Ready for rental with documents available.");
    await userEvent.click(screen.getByRole("button", { name: /create listing/i }));

    await waitFor(() => expect(vehicleMarketplaceApi.createVehicleMarketplaceListing).toHaveBeenCalled());
    const payload = vehicleMarketplaceApi.createVehicleMarketplaceListing.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      city: "Skopje",
      countryCode: "MK",
      currency: "BGN",
      description: "Ready for rental with documents available.",
      isRegistered: true,
      priceAmount: "18000",
      registrationExpiresAt: "2027-05-20",
      title: "MAN TGX for rent",
    }));
    expect(payload).not.toHaveProperty("bodyType");
    expect(payload).not.toHaveProperty("capacityKg");
    expect(payload).not.toHaveProperty("volumeM3");
    expect(payload).not.toHaveProperty("refrigerated");
    expect(payload).not.toHaveProperty("hazmatCertified");
    expect(payload).not.toHaveProperty("status");
  });

  it("creates negotiable listings without price amount fields", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "Create vehicle listing" });
    await userEvent.type(screen.getByLabelText(/title/i), "Schmitz trailer for sale");
    await userEvent.selectOptions(screen.getByLabelText(/vehicle type/i), "TRAILER");
    await userEvent.type(screen.getByLabelText(/city/i), "Skopje");
    await userEvent.selectOptions(screen.getByLabelText(/registration status/i), "UNREGISTERED");
    await userEvent.selectOptions(screen.getByLabelText(/price type/i), "NEGOTIABLE");

    expect(screen.queryByLabelText(/registration expiry date/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/price amount/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/currency/i)).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /create listing/i }));

    await waitFor(() => expect(vehicleMarketplaceApi.createVehicleMarketplaceListing).toHaveBeenCalled());
    const payload = vehicleMarketplaceApi.createVehicleMarketplaceListing.mock.calls[0][0];
    expect(payload).toEqual(expect.objectContaining({
      city: "Skopje",
      isRegistered: false,
      title: "Schmitz trailer for sale",
      vehicleType: "TRAILER",
    }));
    expect(payload).not.toHaveProperty("priceAmount");
    expect(payload).not.toHaveProperty("currency");
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { LocationsPage } from "./LocationsPage";
import { RoutesPage } from "./RoutesPage";

const geoApi = vi.hoisted(() => ({
  listSupportedCities: vi.fn(),
  listSupportedCountries: vi.fn(),
}));

const locationsRoutesApi = vi.hoisted(() => ({
  createLocation: vi.fn(),
  createRoute: vi.fn(),
  estimateRoute: vi.fn(),
  listLocations: vi.fn(),
  listRoutes: vi.fn(),
}));

vi.mock("@/shared/api/modules/geo", () => ({
  listSupportedCities: geoApi.listSupportedCities,
  listSupportedCountries: geoApi.listSupportedCountries,
}));

vi.mock("@/shared/api/modules/locationsRoutes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/locationsRoutes")>()),
  createLocation: locationsRoutesApi.createLocation,
  createRoute: locationsRoutesApi.createRoute,
  estimateRoute: locationsRoutesApi.estimateRoute,
  listLocations: locationsRoutesApi.listLocations,
  listRoutes: locationsRoutesApi.listRoutes,
}));

function renderRoutesPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <RoutesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function renderLocationsPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <LocationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("routes page catalog and estimate UX", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: {
        companyId: "company_1",
        email: "admin@cargo.test",
        firstName: "Ada",
        id: "user_1",
        isActive: true,
        lastName: "Admin",
        role: "COMPANY_ADMIN",
      },
    });
    geoApi.listSupportedCountries.mockResolvedValue([{ code: "MK", name: "North Macedonia", nativeName: "Македонија" }]);
    geoApi.listSupportedCities.mockResolvedValue([{ countryCode: "MK", id: "city_1", lat: "41.9973000", lng: "21.4280000", name: "Skopje", region: "Skopje" }]);
    locationsRoutesApi.listLocations.mockResolvedValue([
      { city: "Skopje", countryCode: "MK", createdAt: "", deletedAt: null, id: "loc_origin", lat: "41.9973000", lng: "21.4280000", updatedAt: "" },
      { city: "Bitola", countryCode: "MK", createdAt: "", deletedAt: null, id: "loc_destination", lat: "41.0319000", lng: "21.3347000", updatedAt: "" },
    ]);
    locationsRoutesApi.listRoutes.mockResolvedValue([]);
    locationsRoutesApi.createLocation.mockResolvedValue({});
    locationsRoutesApi.createRoute.mockResolvedValue({});
    locationsRoutesApi.estimateRoute.mockResolvedValue({
      distanceKm: 61,
      estimatedDurationMinutes: 92,
      profile: "driving-hgv",
      provider: "OPENROUTESERVICE",
    });
  });

  it("uses backend country and city options for location creation", async () => {
    renderLocationsPage();

    expect(await screen.findByRole("option", { name: "North Macedonia (MK)" })).toBeInTheDocument();
    await userEvent.selectOptions(await screen.findByLabelText(/^country/i), "MK");
    expect(await screen.findByRole("option", { name: "Skopje, Skopje" })).toBeInTheDocument();

    await userEvent.selectOptions(screen.getByLabelText(/^city/i), "Skopje");
    await userEvent.click(screen.getByRole("button", { name: /add location/i }));

    await waitFor(() => expect(locationsRoutesApi.createLocation).toHaveBeenCalled());
    expect(locationsRoutesApi.createLocation).toHaveBeenCalledWith(expect.objectContaining({
      city: "Skopje",
      countryCode: "MK",
      lat: "41.9973000",
      lng: "21.4280000",
      region: "Skopje",
    }), expect.anything());
  });

  it("auto-fills distance and duration from route estimate", async () => {
    renderRoutesPage();

    expect(await screen.findAllByRole("option", { name: "Skopje, MK" })).toHaveLength(2);
    expect(await screen.findAllByRole("option", { name: "Bitola, MK" })).toHaveLength(2);
    await userEvent.selectOptions(await screen.findByLabelText(/origin/i), "loc_origin");
    await userEvent.selectOptions(screen.getByLabelText(/destination/i), "loc_destination");

    await waitFor(() => expect(locationsRoutesApi.estimateRoute).toHaveBeenCalledWith(expect.objectContaining({
      destinationLocationId: "loc_destination",
      originLocationId: "loc_origin",
      vehicleProfile: "TRUCK",
    }), expect.anything()));
    await waitFor(() => expect(screen.getByLabelText(/distance km/i)).toHaveValue(61));
    expect(screen.getByLabelText(/duration minutes/i)).toHaveValue(92);
  });
});

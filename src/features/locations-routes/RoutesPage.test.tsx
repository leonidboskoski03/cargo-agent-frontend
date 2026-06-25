import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
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
  deleteLocation: vi.fn(),
  estimateRoute: vi.fn(),
  listLocations: vi.fn(),
  listRoutes: vi.fn(),
  restoreLocation: vi.fn(),
  restoreRoute: vi.fn(),
  updateLocation: vi.fn(),
}));

vi.mock("@/shared/api/modules/geo", () => ({
  listSupportedCities: geoApi.listSupportedCities,
  listSupportedCountries: geoApi.listSupportedCountries,
}));

vi.mock("@/shared/api/modules/locationsRoutes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/locationsRoutes")>()),
  createLocation: locationsRoutesApi.createLocation,
  createRoute: locationsRoutesApi.createRoute,
  deleteLocation: locationsRoutesApi.deleteLocation,
  estimateRoute: locationsRoutesApi.estimateRoute,
  listLocations: locationsRoutesApi.listLocations,
  listRoutes: locationsRoutesApi.listRoutes,
  restoreLocation: locationsRoutesApi.restoreLocation,
  restoreRoute: locationsRoutesApi.restoreRoute,
  updateLocation: locationsRoutesApi.updateLocation,
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
    locationsRoutesApi.deleteLocation.mockResolvedValue({
      city: "Skopje",
      countryCode: "MK",
      createdAt: "",
      deletedAt: "2026-06-12T00:00:00.000Z",
      id: "loc_origin",
      updatedAt: "",
    });
    locationsRoutesApi.restoreLocation.mockResolvedValue({});
    locationsRoutesApi.restoreRoute.mockResolvedValue({});
    locationsRoutesApi.updateLocation.mockResolvedValue({});
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

  it("keeps the location registry compact and hides coordinates", async () => {
    locationsRoutesApi.listLocations.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        city: `City ${index + 1}`,
        countryCode: "MK",
        createdAt: "",
        deletedAt: null,
        id: `loc_${index + 1}`,
        lat: "41.9973000",
        lng: "21.4280000",
        region: "Skopje",
        updatedAt: "",
      })),
    );

    renderLocationsPage();

    expect(await screen.findByText("City 1")).toBeInTheDocument();
    expect(screen.queryByText("Coordinates")).not.toBeInTheDocument();
    expect(screen.queryByText("41.9973000, 21.4280000")).not.toBeInTheDocument();
    expect(screen.queryByText("City 6")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByText("City 6")).toBeInTheDocument();
  });

  it("requires confirmation before deleting a location", async () => {
    renderLocationsPage();

    await userEvent.click(await screen.findByRole("button", { name: /delete skopje/i }));
    expect(locationsRoutesApi.deleteLocation).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => expect(locationsRoutesApi.deleteLocation).toHaveBeenCalledWith("loc_origin", expect.anything()));
  });

  it("shows deleted locations in a dedicated view and restores them", async () => {
    locationsRoutesApi.listLocations.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          city: "Bitola",
          countryCode: "MK",
          createdAt: "",
          deletedAt: "2026-06-12T00:00:00.000Z",
          id: "loc_deleted",
          region: "Pelagonia",
          updatedAt: "",
        }]
        : [{
          city: "Skopje",
          countryCode: "MK",
          createdAt: "",
          deletedAt: null,
          id: "loc_origin",
          region: "Skopje",
          updatedAt: "",
        }],
    ));

    renderLocationsPage();

    expect(await screen.findAllByText("Skopje")).not.toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("Bitola")).toBeInTheDocument();
    expect(screen.getAllByText("Deleted")).not.toHaveLength(0);
    await userEvent.click(screen.getByRole("button", { name: /restore bitola/i }));

    await waitFor(() => expect(locationsRoutesApi.restoreLocation).toHaveBeenCalledWith("loc_deleted", expect.anything()));
  });

  it("opens location editing in a focused modal", async () => {
    renderLocationsPage();

    await userEvent.click(await screen.findByRole("button", { name: /edit skopje/i }));
    const dialog = await screen.findByRole("dialog", { name: /edit location/i });

    expect(within(dialog).getByText(/update skopje, mk/i)).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText(/postal code/i));
    await userEvent.type(within(dialog).getByLabelText(/postal code/i), "1000");
    await userEvent.click(within(dialog).getByRole("button", { name: /save location/i }));

    await waitFor(() => expect(locationsRoutesApi.updateLocation).toHaveBeenCalledWith("loc_origin", expect.objectContaining({ postalCode: "1000" })));
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

  it("shows a created route preview above the registry with zoom and hide controls", async () => {
    locationsRoutesApi.createRoute.mockResolvedValue({
      createdAt: "",
      deletedAt: null,
      destinationLocation: { city: "Bitola", countryCode: "MK", deletedAt: null, id: "loc_destination", lat: "41.0319000", lng: "21.3347000" },
      destinationLocationId: "loc_destination",
      distanceKm: 61,
      estimatedDurationMinutes: 92,
      id: "route_created",
      isActive: true,
      originLocation: { city: "Skopje", countryCode: "MK", deletedAt: null, id: "loc_origin", lat: "41.9973000", lng: "21.4280000" },
      originLocationId: "loc_origin",
      updatedAt: "",
    });

    renderRoutesPage();

    await userEvent.selectOptions(await screen.findByLabelText(/origin/i), "loc_origin");
    await userEvent.selectOptions(screen.getByLabelText(/destination/i), "loc_destination");
    await waitFor(() => expect(screen.getByLabelText(/distance km/i)).toHaveValue(61));
    await userEvent.click(screen.getByRole("button", { name: /add route/i }));

    expect(await screen.findByText("Created route preview")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /zoom route map in/i }));
    expect(screen.getByText("125%")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /hide created route preview/i }));
    expect(screen.queryByText("Created route preview")).not.toBeInTheDocument();
  });

  it("opens a route map on demand from the registry", async () => {
    locationsRoutesApi.listRoutes.mockResolvedValue([
      {
        createdAt: "",
        deletedAt: null,
        destinationLocation: { city: "Bitola", countryCode: "MK", deletedAt: null, id: "loc_destination", lat: "41.0319000", lng: "21.3347000" },
        destinationLocationId: "loc_destination",
        distanceKm: 61,
        estimatedDurationMinutes: 92,
        id: "route_1",
        isActive: true,
        originLocation: { city: "Skopje", countryCode: "MK", deletedAt: null, id: "loc_origin", lat: "41.9973000", lng: "21.4280000" },
        originLocationId: "loc_origin",
        updatedAt: "",
      },
    ]);

    renderRoutesPage();

    expect(await screen.findByText("Route registry")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /skopje, mk to bitola, mk/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /open map for skopje, mk to bitola, mk/i }));
    expect(await screen.findByRole("dialog", { name: /skopje, mk to bitola, mk/i })).toBeInTheDocument();
    expect(screen.getByText(/fitted coordinate preview/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /close route map/i }));
    expect(screen.queryByRole("dialog", { name: /skopje, mk to bitola, mk/i })).not.toBeInTheDocument();
  });

  it("shows deleted routes in a dedicated view and restores them", async () => {
    locationsRoutesApi.listRoutes.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          createdAt: "",
          deletedAt: "2026-06-12T00:00:00.000Z",
          destinationLocation: { city: "Bitola", countryCode: "MK", deletedAt: null, id: "loc_destination", lat: "41.0319000", lng: "21.3347000" },
          destinationLocationId: "loc_destination",
          distanceKm: 61,
          estimatedDurationMinutes: 92,
          id: "route_deleted",
          isActive: true,
          originLocation: { city: "Skopje", countryCode: "MK", deletedAt: null, id: "loc_origin", lat: "41.9973000", lng: "21.4280000" },
          originLocationId: "loc_origin",
          updatedAt: "",
        }]
        : [{
          createdAt: "",
          deletedAt: null,
          destinationLocation: { city: "Bitola", countryCode: "MK", deletedAt: null, id: "loc_destination", lat: "41.0319000", lng: "21.3347000" },
          destinationLocationId: "loc_destination",
          distanceKm: 61,
          estimatedDurationMinutes: 92,
          id: "route_active",
          isActive: true,
          originLocation: { city: "Skopje", countryCode: "MK", deletedAt: null, id: "loc_origin", lat: "41.9973000", lng: "21.4280000" },
          originLocationId: "loc_origin",
          updatedAt: "",
        }],
    ));

    renderRoutesPage();

    expect(await screen.findByText("Route registry")).toBeInTheDocument();
    expect(locationsRoutesApi.listRoutes).toHaveBeenCalledWith({ deleted: "active" });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByRole("button", { name: /restore route skopje, mk to bitola, mk/i })).toBeInTheDocument();
    expect(locationsRoutesApi.listRoutes).toHaveBeenCalledWith({ deleted: "only" });
    await userEvent.click(screen.getByRole("button", { name: /restore route skopje, mk to bitola, mk/i }));

    await waitFor(() => expect(locationsRoutesApi.restoreRoute).toHaveBeenCalledWith("route_deleted", expect.anything()));
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { PostsPage } from "./PostsPage";

const geoApi = vi.hoisted(() => ({
  listSupportedCountries: vi.fn(),
}));

const locationsRoutesApi = vi.hoisted(() => ({
  createLocation: vi.fn(),
  createRoute: vi.fn(),
  listRoutes: vi.fn(),
}));

const postsApi = vi.hoisted(() => ({
  changePostStatus: vi.fn(),
  createPost: vi.fn(),
  deletePost: vi.fn(),
  listPosts: vi.fn(),
  restorePost: vi.fn(),
}));

vi.mock("@/shared/api/modules/geo", () => ({
  listSupportedCountries: geoApi.listSupportedCountries,
}));

vi.mock("@/shared/api/modules/locationsRoutes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/locationsRoutes")>()),
  createLocation: locationsRoutesApi.createLocation,
  createRoute: locationsRoutesApi.createRoute,
  listRoutes: locationsRoutesApi.listRoutes,
}));

vi.mock("@/shared/api/modules/posts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/posts")>()),
  changePostStatus: postsApi.changePostStatus,
  createPost: postsApi.createPost,
  deletePost: postsApi.deletePost,
  listPosts: postsApi.listPosts,
  restorePost: postsApi.restorePost,
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

const routes = [
  {
    createdAt: "",
    deletedAt: null,
    destinationLocation: { city: "Sofia", countryCode: "BG", createdAt: "", deletedAt: null, id: "loc_2", updatedAt: "" },
    destinationLocationId: "loc_2",
    distanceKm: 240,
    estimatedDurationMinutes: 280,
    id: "route_1",
    originLocation: { city: "Skopje", countryCode: "MK", createdAt: "", deletedAt: null, id: "loc_1", updatedAt: "" },
    originLocationId: "loc_1",
    updatedAt: "",
  },
  {
    createdAt: "",
    deletedAt: null,
    destinationLocation: { city: "Bitola", countryCode: "MK", createdAt: "", deletedAt: null, id: "loc_4", updatedAt: "" },
    destinationLocationId: "loc_4",
    distanceKm: 180,
    estimatedDurationMinutes: 200,
    id: "route_2",
    originLocation: { city: "Prilep", countryCode: "MK", createdAt: "", deletedAt: null, id: "loc_3", updatedAt: "" },
    originLocationId: "loc_3",
    updatedAt: "",
  },
];

function post(overrides: Record<string, unknown>) {
  return {
    cargoDescription: "Cargo",
    cargoType: null,
    companyId: "company_123",
    createdAt: "",
    createdByUserId: "user_123",
    currency: "EUR",
    deletedAt: null,
    hazmat: false,
    id: "post_1",
    isPromoted: false,
    priceAmount: null,
    priceType: "REQUEST_QUOTE",
    routeId: "route_1",
    status: "OPEN",
    temperatureControlRequired: false,
    title: "Steel coils",
    updatedAt: "",
    ...overrides,
  };
}

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PostsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PostsPage marketplace filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    geoApi.listSupportedCountries.mockResolvedValue([]);
    locationsRoutesApi.listRoutes.mockResolvedValue(routes);
    postsApi.listPosts.mockResolvedValue([
      post({
        companyId: "other_company",
        id: "post_1",
        route: {
          destinationLocation: { city: "Sofia", countryCode: "BG" },
          id: "other_route_1",
          originLocation: { city: "Skopje", countryCode: "MK" },
        },
        routeId: "other_route_1",
        status: "OPEN",
        title: "Steel coils",
      }),
      post({
        companyId: "other_company",
        id: "post_2",
        route: {
          destinationLocation: { city: "Tirana", countryCode: "AL" },
          id: "other_route_2",
          originLocation: { city: "Bitola", countryCode: "MK" },
        },
        routeId: "other_route_2",
        status: "OPEN",
        title: "Frozen goods",
      }),
    ]);
  });

  it("filters visible posts by search text without raw enum labels", async () => {
    renderPage();

    expect(await screen.findByText("Steel coils")).toBeInTheDocument();
    expect(screen.getByText("Skopje, MK -> Sofia, BG")).toBeInTheDocument();
    expect(screen.getAllByText("Request Quote").length).toBeGreaterThan(0);
    expect(postsApi.listPosts).toHaveBeenLastCalledWith({ scope: "marketplace" });

    await userEvent.type(screen.getByLabelText("Search posts"), "Frozen");

    expect(screen.queryByText("Steel coils")).not.toBeInTheDocument();
    expect(screen.getByText("Frozen goods")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
  });

  it("passes supported status filters to the backend for my posts", async () => {
    renderPage();

    await screen.findByText("Steel coils");
    await userEvent.click(screen.getByRole("button", { name: "My posts" }));
    await userEvent.selectOptions(screen.getByLabelText("Status"), "CANCELLED");

    await waitFor(() => expect(postsApi.listPosts).toHaveBeenLastCalledWith({ scope: "mine", status: "CANCELLED" }));
  });
});

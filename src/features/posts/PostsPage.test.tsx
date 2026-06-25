import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { PostsPage } from "./PostsPage";

const geoApi = vi.hoisted(() => ({
  listSupportedCountries: vi.fn(),
}));

const locationsRoutesApi = vi.hoisted(() => ({
  createLocation: vi.fn(),
  createRoute: vi.fn(),
  listLocations: vi.fn(),
  listRoutes: vi.fn(),
}));

const postsApi = vi.hoisted(() => ({
  boostPost: vi.fn(),
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
  listLocations: locationsRoutesApi.listLocations,
  listRoutes: locationsRoutesApi.listRoutes,
}));

vi.mock("@/shared/api/modules/posts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/posts")>()),
  boostPost: postsApi.boostPost,
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
    createdAt: "2026-06-14T10:00:00.000Z",
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

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
}

function renderPage(props?: ComponentProps<typeof PostsPage>) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <PostsPage {...props} />
        <LocationProbe />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PostsPage marketplace filters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    geoApi.listSupportedCountries.mockResolvedValue([]);
    locationsRoutesApi.listLocations.mockResolvedValue([]);
    locationsRoutesApi.listRoutes.mockResolvedValue(routes);
    postsApi.listPosts.mockResolvedValue([
      post({
        companyId: "other_company",
        company: { city: "Skopje", countryCode: "MK", id: "other_company", isVerified: true, name: "Atlas Freight" },
        id: "post_1",
        createdAt: "2026-06-14T10:00:00.000Z",
        description: "Steel coils ready for covered transport this week.",
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
        company: { city: "Bitola", countryCode: "MK", id: "other_company_2", isVerified: false, name: "Cold Chain DOO" },
        createdAt: "2026-06-13T09:00:00.000Z",
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
    postsApi.restorePost.mockResolvedValue(post({ deletedAt: null, id: "post_deleted", title: "Deleted load" }));
  });

  it("filters visible posts by search text without raw enum labels", async () => {
    renderPage();

    expect(await screen.findByText("Steel coils")).toBeInTheDocument();
    expect(screen.getByText("Best route matches")).toBeInTheDocument();
    expect(screen.getByText("Skopje, MK -> Sofia, BG")).toBeInTheDocument();
    expect(screen.getByText("Posted Jun 14, 2026")).toBeInTheDocument();
    expect(screen.getByText("Atlas Freight, Skopje")).toBeInTheDocument();
    expect(screen.getAllByText("Request Quote").length).toBeGreaterThan(0);
    expect(postsApi.listPosts).toHaveBeenLastCalledWith({ scope: "marketplace" });

    await userEvent.type(screen.getByLabelText("Search posts"), "Frozen");

    expect(screen.queryByText("Steel coils")).not.toBeInTheDocument();
    expect(screen.getByText("Frozen goods")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
  });

  it("filters marketplace posts by route country and location from the shared popover", async () => {
    renderPage();

    expect(await screen.findByText("Steel coils")).toBeInTheDocument();
    expect(screen.getByText("Frozen goods")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(await screen.findByRole("dialog", { name: /transport marketplace filters/i })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Country code"), "bg");
    await userEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(screen.getByText("Steel coils")).toBeInTheDocument();
    expect(screen.queryByText("Frozen goods")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^filters \(1\)$/i }));
    await userEvent.clear(screen.getByLabelText("Country code"));
    await userEvent.type(screen.getByLabelText("Location"), "Tirana");
    await userEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(screen.queryByText("Steel coils")).not.toBeInTheDocument();
    expect(screen.getByText("Frozen goods")).toBeInTheDocument();
  });

  it("passes supported status filters to the backend for my posts", async () => {
    renderPage({ fixedScope: "mine" });

    await screen.findByText("Steel coils");
    expect(screen.getByRole("columnheader", { name: "Posted" })).toBeInTheDocument();
    expect(screen.getByText("Jun 14, 2026")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(await screen.findByRole("dialog", { name: /transport post filters/i })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Status"), "CANCELLED");
    await userEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    await waitFor(() => expect(postsApi.listPosts).toHaveBeenLastCalledWith({ deleted: "active", scope: "mine", status: "CANCELLED" }));
  });

  it("shows deleted my posts in a dedicated view and restores them", async () => {
    postsApi.listPosts.mockImplementation((params?: { deleted?: string; scope?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [post({ deletedAt: "2026-06-13T00:00:00.000Z", id: "post_deleted", title: "Deleted load" })]
        : [post({ deletedAt: null, id: "post_active", title: "Active load" })],
    ));
    renderPage({ fixedScope: "mine" });

    expect(await screen.findByText("Active load")).toBeInTheDocument();
    expect(postsApi.listPosts).toHaveBeenCalledWith({ deleted: "active", scope: "mine" });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("Deleted load")).toBeInTheDocument();
    expect(screen.queryByText("Active load")).not.toBeInTheDocument();
    expect(postsApi.listPosts).toHaveBeenCalledWith({ deleted: "only", scope: "mine" });
    await userEvent.click(screen.getByRole("button", { name: /restore/i }));

    await waitFor(() => expect(postsApi.restorePost).toHaveBeenCalledWith("post_deleted", expect.anything()));
  });

  it("separates published posts from drafts and archived posts", async () => {
    postsApi.listPosts.mockResolvedValue([
      post({ id: "post_open", status: "OPEN", title: "Published load" }),
      post({ id: "post_draft", status: "DRAFT", title: "Reusable draft" }),
      post({ id: "post_archived", status: "ARCHIVED", title: "Archived load" }),
    ]);
    renderPage({ fixedScope: "mine" });

    expect(await screen.findByText("Published load")).toBeInTheDocument();
    expect(screen.queryByText("Reusable draft")).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^drafts$/i }));

    expect(await screen.findByText("Reusable draft")).toBeInTheDocument();
    expect(screen.getByText("Archived load")).toBeInTheDocument();
    expect(screen.queryByText("Published load")).not.toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Publish" })[0]);

    await waitFor(() => expect(postsApi.changePostStatus).toHaveBeenCalledWith("post_draft", "OPEN"));
  });

  it("keeps planned creation focused and redirects after creating a post", async () => {
    postsApi.createPost.mockResolvedValue(post({ id: "post_new", routeId: "route_1", title: "New planned load" }));
    renderPage({ creationOnly: true, fixedScope: "mine", mode: "planned" });

    await screen.findByRole("heading", { name: "Create planned post" });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Title"), "New planned load");
    await userEvent.selectOptions(screen.getByLabelText(/Route/), "route_1");
    await userEvent.type(screen.getByLabelText("Cargo description"), "Palletized cargo");
    await userEvent.click(screen.getAllByRole("button", { name: "Create post" })[0]);

    await waitFor(() =>
      expect(postsApi.createPost).toHaveBeenCalledWith(expect.objectContaining({ routeId: "route_1", title: "New planned load" }), expect.anything()),
    );
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/posts/post_new"));
  });
});

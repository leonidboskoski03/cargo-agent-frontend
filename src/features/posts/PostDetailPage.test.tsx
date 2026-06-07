import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { PostDetailPage } from "./PostDetailPage";

const bidsApi = vi.hoisted(() => ({
  changeBidStatus: vi.fn(),
  createBid: vi.fn(),
  deleteBid: vi.fn(),
  listBids: vi.fn(),
  restoreBid: vi.fn(),
  updateBid: vi.fn(),
}));

const contractsApi = vi.hoisted(() => ({
  createContract: vi.fn(),
  listContracts: vi.fn(),
}));

const locationsRoutesApi = vi.hoisted(() => ({
  listRoutes: vi.fn(),
}));

const postsApi = vi.hoisted(() => ({
  changePostStatus: vi.fn(),
  deletePost: vi.fn(),
  getPost: vi.fn(),
  restorePost: vi.fn(),
  updatePost: vi.fn(),
}));

vi.mock("@/shared/api/modules/bids", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/bids")>()),
  changeBidStatus: bidsApi.changeBidStatus,
  createBid: bidsApi.createBid,
  deleteBid: bidsApi.deleteBid,
  listBids: bidsApi.listBids,
  restoreBid: bidsApi.restoreBid,
  updateBid: bidsApi.updateBid,
}));

vi.mock("@/shared/api/modules/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/contracts")>()),
  createContract: contractsApi.createContract,
  listContracts: contractsApi.listContracts,
}));

vi.mock("@/shared/api/modules/locationsRoutes", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/locationsRoutes")>()),
  listRoutes: locationsRoutesApi.listRoutes,
}));

vi.mock("@/shared/api/modules/posts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/posts")>()),
  changePostStatus: postsApi.changePostStatus,
  deletePost: postsApi.deletePost,
  getPost: postsApi.getPost,
  restorePost: postsApi.restorePost,
  updatePost: postsApi.updatePost,
}));

const adminUser = {
  companyId: "company_owner",
  email: "admin@cargo.test",
  firstName: "Ada",
  id: "user_123",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/posts/post_1"]}>
        <Routes>
          <Route element={<PostDetailPage />} path="/posts/:postId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("PostDetailPage marketplace actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    postsApi.getPost.mockResolvedValue({
      cargoDescription: "Steel load",
      cargoType: null,
      companyId: "company_owner",
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
      title: "Skopje load",
      updatedAt: "",
      weightKg: 900,
    });
    bidsApi.listBids.mockResolvedValue([
      {
        carrierCompanyId: "company_carrier",
        createdAt: "",
        createdByUserId: "carrier_user",
        currency: "EUR",
        deletedAt: null,
        id: "bid_123456789",
        message: "Can pick up tomorrow",
        offeredPriceAmount: "1200",
        post: { companyId: "company_owner", currency: "EUR", deletedAt: null, id: "post_1", priceType: "REQUEST_QUOTE", routeId: "route_1", status: "OPEN" },
        postId: "post_1",
        status: "PENDING",
        updatedAt: "",
      },
    ]);
    contractsApi.listContracts.mockResolvedValue([]);
    locationsRoutesApi.listRoutes.mockResolvedValue([
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
    ]);
    bidsApi.changeBidStatus.mockResolvedValue({});
  });

  it("confirms bid decisions before mutating status", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Skopje load" })).toBeInTheDocument();
    expect(screen.getByText("Request Quote")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Accept" }));

    expect(screen.getByText("Confirm bid action")).toBeInTheDocument();
    expect(bidsApi.changeBidStatus).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(bidsApi.changeBidStatus).toHaveBeenCalledWith("bid_123456789", "ACCEPTED"));
  });
});

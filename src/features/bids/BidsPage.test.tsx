import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { BidsPage } from "./BidsPage";

const bidsApi = vi.hoisted(() => ({
  boostBid: vi.fn(),
  changeBidStatus: vi.fn(),
  deleteBid: vi.fn(),
  listBidActivities: vi.fn(),
  listBids: vi.fn(),
  restoreBid: vi.fn(),
  updateBid: vi.fn(),
}));

const contractsApi = vi.hoisted(() => ({
  createContract: vi.fn(),
}));

vi.mock("@/shared/api/modules/bids", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/bids")>()),
  boostBid: bidsApi.boostBid,
  changeBidStatus: bidsApi.changeBidStatus,
  deleteBid: bidsApi.deleteBid,
  listBidActivities: bidsApi.listBidActivities,
  listBids: bidsApi.listBids,
  restoreBid: bidsApi.restoreBid,
  updateBid: bidsApi.updateBid,
}));

vi.mock("@/shared/api/modules/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/contracts")>()),
  createContract: contractsApi.createContract,
}));

const adminUser = {
  companyId: "shipper_company",
  email: "admin@test.local",
  firstName: "Ada",
  id: "admin_1",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
};

function renderWithProviders(ui: ReactNode, route = "/bids") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BidsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
  });

  it("renders received bid actions for the post owner", async () => {
    bidsApi.listBids.mockResolvedValue([
      {
        carrierCompanyId: "carrier_company",
        carrierCompany: { city: "Skopje", countryCode: "MK", id: "carrier_company", isVerified: false, name: "Carrier Co" },
        createdAt: "2026-06-09T10:00:00.000Z",
        createdByUserId: "carrier_admin",
        currency: "EUR",
        deletedAt: null,
        estimatedDeliveryAt: null,
        estimatedPickupAt: null,
        id: "bid_123456789",
        message: "Can cover this lane.",
        offeredPriceAmount: "750",
        boostedUntil: "2099-06-09T10:00:00.000Z",
        post: {
          cargoDescription: "Pallets",
          companyId: "shipper_company",
          currency: "EUR",
          deletedAt: null,
          id: "post_123456789",
          priceAmount: null,
          priceType: "REQUEST_QUOTE",
          route: {
            destinationLocation: { city: "Sofia", countryCode: "BG", id: "loc_2" },
            distanceKm: 240,
            estimatedDurationMinutes: 260,
            id: "route_1",
            originLocation: { city: "Skopje", countryCode: "MK", id: "loc_1" },
          },
          routeId: "route_1",
          status: "OPEN",
          title: "Skopje to Sofia",
        },
        postId: "post_123456789",
        status: "PENDING",
        updatedAt: "2026-06-09T10:00:00.000Z",
      },
    ]);

    renderWithProviders(<BidsPage />);

    expect(await screen.findByText("Skopje to Sofia")).toBeInTheDocument();
    expect(screen.getByText("Boosted bid")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reject/i })).toBeInTheDocument();
  });

  it("confirms that accepting a bid creates a contract automatically", async () => {
    bidsApi.listBids.mockResolvedValue([
      {
        carrierCompanyId: "carrier_company",
        carrierCompany: { city: "Skopje", countryCode: "MK", id: "carrier_company", isVerified: false, name: "Carrier Co" },
        createdAt: "2026-06-09T10:00:00.000Z",
        createdByUserId: "carrier_admin",
        currency: "EUR",
        deletedAt: null,
        estimatedDeliveryAt: null,
        estimatedPickupAt: null,
        id: "bid_accepted",
        message: "Can cover this lane.",
        offeredPriceAmount: "750",
        post: {
          cargoDescription: "Pallets",
          companyId: "shipper_company",
          currency: "EUR",
          deletedAt: null,
          id: "post_123456789",
          priceAmount: null,
          priceType: "REQUEST_QUOTE",
          route: {
            destinationLocation: { city: "Sofia", countryCode: "BG", id: "loc_2" },
            distanceKm: 240,
            estimatedDurationMinutes: 260,
            id: "route_1",
            originLocation: { city: "Skopje", countryCode: "MK", id: "loc_1" },
          },
          routeId: "route_1",
          status: "OPEN",
          title: "Skopje to Sofia",
        },
        postId: "post_123456789",
        status: "PENDING",
        updatedAt: "2026-06-09T10:00:00.000Z",
      },
    ]);
    bidsApi.changeBidStatus.mockResolvedValue({
      carrierCompanyId: "carrier_company",
      carrierCompany: { city: "Skopje", countryCode: "MK", id: "carrier_company", isVerified: false, name: "Carrier Co" },
      contract: { id: "contract_123", status: "CONFIRMED" },
      createdAt: "2026-06-09T10:00:00.000Z",
      createdByUserId: "carrier_admin",
      currency: "EUR",
      deletedAt: null,
      estimatedDeliveryAt: null,
      estimatedPickupAt: null,
      id: "bid_accepted",
      message: "Can cover this lane.",
      offeredPriceAmount: "750",
      post: {
        cargoDescription: "Pallets",
        companyId: "shipper_company",
        currency: "EUR",
        deletedAt: null,
        id: "post_123456789",
        priceAmount: null,
        priceType: "REQUEST_QUOTE",
        route: {
          destinationLocation: { city: "Sofia", countryCode: "BG", id: "loc_2" },
          distanceKm: 240,
          estimatedDurationMinutes: 260,
          id: "route_1",
          originLocation: { city: "Skopje", countryCode: "MK", id: "loc_1" },
        },
        routeId: "route_1",
        status: "OPEN",
        title: "Skopje to Sofia",
      },
      postId: "post_123456789",
      status: "ACCEPTED",
      updatedAt: "2026-06-09T10:00:00.000Z",
    });

    renderWithProviders(<BidsPage />);

    await userEvent.click(await screen.findByRole("button", { name: /accept/i }));
    expect(screen.getByText("Accept bid and create contract?")).toBeInTheDocument();
    expect(screen.getByText(/contract will be created automatically/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Confirm" }));

    expect(await screen.findByRole("link", { name: /open contract/i })).toHaveAttribute("href", "/contracts/contract_123");
  });

  it("opens a bid detail drawer with full message and activity timeline", async () => {
    bidsApi.listBids.mockResolvedValue([
      {
        carrierCompanyId: "carrier_company",
        carrierCompany: { city: "Skopje", countryCode: "MK", id: "carrier_company", isVerified: false, name: "Carrier Co" },
        createdAt: "2026-06-09T10:00:00.000Z",
        createdByUserId: "carrier_admin",
        currency: "EUR",
        deletedAt: null,
        estimatedDeliveryAt: "2026-06-10T12:00:00.000Z",
        estimatedPickupAt: "2026-06-10T08:00:00.000Z",
        id: "bid_123456789",
        message: "Long operational context with loading window, dock contact, and ADR handling details.",
        offeredPriceAmount: "750",
        post: {
          cargoDescription: "Pallets",
          companyId: "shipper_company",
          currency: "EUR",
          deletedAt: null,
          id: "post_123456789",
          priceAmount: null,
          priceType: "REQUEST_QUOTE",
          route: {
            destinationLocation: { city: "Sofia", countryCode: "BG", id: "loc_2" },
            distanceKm: 240,
            estimatedDurationMinutes: 260,
            id: "route_1",
            originLocation: { city: "Skopje", countryCode: "MK", id: "loc_1" },
          },
          routeId: "route_1",
          status: "OPEN",
          title: "Skopje to Sofia",
        },
        postId: "post_123456789",
        status: "PENDING",
        updatedAt: "2026-06-09T10:00:00.000Z",
      },
    ]);
    bidsApi.listBidActivities.mockResolvedValue([
      {
        actorCompanyId: "carrier_company",
        actorUserId: "carrier_admin",
        bidId: "bid_123456789",
        createdAt: "2026-06-09T10:00:00.000Z",
        id: "activity_1",
        message: "Bid created",
        metadataJson: null,
        type: "CREATED",
      },
    ]);

    renderWithProviders(<BidsPage />);

    await userEvent.click(await screen.findByRole("button", { name: /details/i }));

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/long operational context/i)).toBeInTheDocument();
    expect(await screen.findByText("Bid created")).toBeInTheDocument();
    expect(screen.getAllByText(/240 km/i).length).toBeGreaterThanOrEqual(2);
  });

  it("shows deleted sent bids in a dedicated view and restores owned bids", async () => {
    bidsApi.listBids.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          carrierCompanyId: "shipper_company",
          carrierCompany: { city: "Skopje", countryCode: "MK", id: "shipper_company", isVerified: false, name: "Shipper Co" },
          createdAt: "2026-06-09T10:00:00.000Z",
          createdByUserId: "admin_1",
          currency: "EUR",
          deletedAt: "2026-06-12T00:00:00.000Z",
          estimatedDeliveryAt: null,
          estimatedPickupAt: null,
          id: "bid_deleted",
          message: "Can cover this lane.",
          offeredPriceAmount: "750",
          post: {
            cargoDescription: "Pallets",
            companyId: "carrier_company",
            currency: "EUR",
            deletedAt: null,
            id: "post_123456789",
            priceAmount: null,
            priceType: "REQUEST_QUOTE",
            route: {
              destinationLocation: { city: "Sofia", countryCode: "BG", id: "loc_2" },
              distanceKm: 240,
              estimatedDurationMinutes: 260,
              id: "route_1",
              originLocation: { city: "Skopje", countryCode: "MK", id: "loc_1" },
            },
            routeId: "route_1",
            status: "OPEN",
            title: "Deleted sent bid",
          },
          postId: "post_123456789",
          status: "PENDING",
          updatedAt: "2026-06-09T10:00:00.000Z",
        }]
        : [],
    ));
    bidsApi.restoreBid.mockResolvedValue({});

    renderWithProviders(<BidsPage />, "/bids?scope=sent");

    expect(await screen.findByText("No bids found")).toBeInTheDocument();
    expect(bidsApi.listBids).toHaveBeenCalledWith({ deleted: "active", postId: undefined, scope: "sent", status: undefined });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("Deleted sent bid")).toBeInTheDocument();
    expect(bidsApi.listBids).toHaveBeenCalledWith({ deleted: "only", postId: undefined, scope: "sent", status: undefined });
    await userEvent.click(screen.getByRole("button", { name: /restore/i }));

    expect(bidsApi.restoreBid).toHaveBeenCalledWith("bid_deleted", expect.anything());
  });
});

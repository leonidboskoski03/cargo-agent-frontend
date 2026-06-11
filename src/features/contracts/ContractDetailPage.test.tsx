import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { ContractDetailPage } from "./ContractDetailPage";

const contractsApi = vi.hoisted(() => ({
  changeContractStatus: vi.fn(),
  deleteContract: vi.fn(),
  getContract: vi.fn(),
  restoreContract: vi.fn(),
  updateContractTimeline: vi.fn(),
}));

vi.mock("@/shared/api/modules/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/contracts")>()),
  changeContractStatus: contractsApi.changeContractStatus,
  deleteContract: contractsApi.deleteContract,
  getContract: contractsApi.getContract,
  restoreContract: contractsApi.restoreContract,
  updateContractTimeline: contractsApi.updateContractTimeline,
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

function renderWithProviders(ui: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/contracts/contract_1"]}>
        <Routes>
          <Route element={ui} path="/contracts/:contractId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ContractDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    contractsApi.getContract.mockResolvedValue({
      acceptedBidId: "bid_123456789",
      agreedPriceAmount: "750",
      carrierCompany: { city: "Sofia", countryCode: "BG", id: "carrier_company", name: "Carrier Co" },
      carrierCompanyId: "carrier_company",
      createdAt: "2026-06-09T10:00:00.000Z",
      currency: "EUR",
      deletedAt: null,
      deliveryActualAt: null,
      deliveryPlannedAt: null,
      id: "contract_1",
      pickupActualAt: null,
      pickupPlannedAt: null,
      post: { cargoDescription: "Pallets", id: "post_1", status: "ASSIGNED", title: "Skopje to Sofia" },
      postId: "post_1",
      route: {
        destinationLocation: { city: "Sofia", countryCode: "BG", id: "loc_2" },
        distanceKm: 240,
        estimatedDurationMinutes: 260,
        id: "route_1",
        originLocation: { city: "Skopje", countryCode: "MK", id: "loc_1" },
      },
      routeId: "route_1",
      shipperCompany: { city: "Skopje", countryCode: "MK", id: "shipper_company", name: "Shipper Co" },
      shipperCompanyId: "shipper_company",
      status: "CONFIRMED",
      updatedAt: "2026-06-09T10:00:00.000Z",
    });
  });

  it("renders agreement source, route, parties, and lifecycle actions without raw primary IDs", async () => {
    renderWithProviders(<ContractDetailPage />);

    expect(await screen.findByRole("heading", { name: "Skopje to Sofia" })).toBeInTheDocument();
    expect(screen.getAllByText("Skopje, MK -> Sofia, BG").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Shipper Co - Skopje, MK")).toBeInTheDocument();
    expect(screen.getByText("Carrier Co - Sofia, BG")).toBeInTheDocument();
    expect(screen.getByText("Accepted bid bid_1234")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /open post/i })).toHaveAttribute("href", "/posts/post_1");
    expect(screen.getByRole("link", { name: /open bids/i })).toHaveAttribute("href", "/bids?postId=post_1");
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { ContractsPage } from "./ContractsPage";

const contractsApi = vi.hoisted(() => ({
  listContracts: vi.fn(),
  restoreContract: vi.fn(),
}));

vi.mock("@/shared/api/modules/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/contracts")>()),
  listContracts: contractsApi.listContracts,
  restoreContract: contractsApi.restoreContract,
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

function contract(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function renderWithProviders(ui: ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ContractsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    contractsApi.listContracts.mockResolvedValue([]);
    contractsApi.restoreContract.mockResolvedValue({});
  });

  it("shows deleted contracts in a dedicated view and restores shipper-owned contracts", async () => {
    contractsApi.listContracts.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [contract({ deletedAt: "2026-06-13T00:00:00.000Z", id: "contract_deleted" })]
        : [contract()],
    ));

    renderWithProviders(<ContractsPage />);

    expect(await screen.findByText("Skopje to Sofia")).toBeInTheDocument();
    expect(contractsApi.listContracts).toHaveBeenCalledWith({ deleted: "active" });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByRole("button", { name: /restore/i })).toBeInTheDocument();
    expect(contractsApi.listContracts).toHaveBeenCalledWith({ deleted: "only" });
    await userEvent.click(screen.getByRole("button", { name: /restore/i }));

    expect(contractsApi.restoreContract).toHaveBeenCalledWith("contract_deleted", expect.anything());
  });
});

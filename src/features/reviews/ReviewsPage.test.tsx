import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { ReviewsPage } from "./ReviewsPage";

const reviewsApi = vi.hoisted(() => ({
  changeReviewStatus: vi.fn(),
  createReview: vi.fn(),
  deleteReview: vi.fn(),
  listReviews: vi.fn(),
  restoreReview: vi.fn(),
}));
const contractsApi = vi.hoisted(() => ({ listContracts: vi.fn() }));

vi.mock("@/shared/api/modules/reviews", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/reviews")>()),
  changeReviewStatus: reviewsApi.changeReviewStatus,
  createReview: reviewsApi.createReview,
  deleteReview: reviewsApi.deleteReview,
  listReviews: reviewsApi.listReviews,
  restoreReview: reviewsApi.restoreReview,
}));

vi.mock("@/shared/api/modules/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/contracts")>()),
  listContracts: contractsApi.listContracts,
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

const driverUser = {
  ...adminUser,
  email: "driver@cargo.test",
  id: "user_driver",
  role: "COMPANY_DRIVER" as const,
};

function renderReviewsPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ReviewsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ReviewsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewsApi.listReviews.mockResolvedValue([]);
    contractsApi.listContracts.mockResolvedValue([
      {
        acceptedBidId: "bid_123",
        agreedPriceAmount: "120",
        carrierCompanyId: "company_carrier",
        createdAt: new Date().toISOString(),
        currency: "EUR",
        deletedAt: null,
        id: "contract_123",
        postId: "post_123",
        routeId: "route_123",
        shipperCompanyId: "company_shipper",
        status: "COMPLETED",
        updatedAt: new Date().toISOString(),
      },
    ]);
  });

  it("shows completed-contract review creation to admins", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    renderReviewsPage();

    expect(await screen.findByRole("button", { name: /create review/i })).toBeInTheDocument();
    expect(contractsApi.listContracts).toHaveBeenCalledWith({ status: "COMPLETED" });
  });

  it("keeps drivers in read-only review mode", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderReviewsPage();

    expect(await screen.findByText(/read-only reviews/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create review/i })).not.toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

function renderReviewsPage(initialPath = "/reviews") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[initialPath]}>
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

  it("preselects a completed contract from the contract detail review link", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    renderReviewsPage("/reviews?contractId=contract_123");

    expect(await screen.findByRole("button", { name: /create review/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/contract id/i)).toHaveValue("contract_123");
    expect(reviewsApi.listReviews).toHaveBeenCalledWith({ contractId: "contract_123", deleted: "active" });
  });

  it("keeps drivers in read-only review mode", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderReviewsPage();

    expect(await screen.findByText(/read-only reviews/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /create review/i })).not.toBeInTheDocument();
  });

  it("shows deleted reviews in a dedicated view and restores authored reviews", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    reviewsApi.listReviews.mockImplementation((params?: { deleted?: string }) => Promise.resolve(
      params?.deleted === "only"
        ? [{
          comment: "Recovered review",
          contract: {
            carrierCompanyId: "company_carrier",
            deletedAt: null,
            id: "contract_123",
            shipperCompanyId: "company_123",
            status: "COMPLETED",
          },
          contractId: "contract_123",
          createdAt: "2026-06-12T00:00:00.000Z",
          deletedAt: "2026-06-13T00:00:00.000Z",
          id: "review_deleted",
          rating: 5,
          reviewerCompanyId: "company_123",
          reviewerUserId: "user_123",
          status: "PUBLISHED",
          targetCompanyId: "company_carrier",
          updatedAt: "2026-06-12T00:00:00.000Z",
        }]
        : [],
    ));
    reviewsApi.restoreReview.mockResolvedValue({});

    renderReviewsPage();

    expect(await screen.findByText("No reviews")).toBeInTheDocument();
    expect(reviewsApi.listReviews).toHaveBeenCalledWith({ deleted: "active" });

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("Recovered review")).toBeInTheDocument();
    expect(reviewsApi.listReviews).toHaveBeenCalledWith({ deleted: "only" });
    await userEvent.click(screen.getByRole("button", { name: /restore/i }));

    expect(reviewsApi.restoreReview).toHaveBeenCalledWith("review_deleted", expect.anything());
  });
});

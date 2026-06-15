import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { DashboardPage } from "./DashboardPage";

const postsApi = vi.hoisted(() => ({
  listPosts: vi.fn(),
}));

const bidsApi = vi.hoisted(() => ({
  listBids: vi.fn(),
}));

const contractsApi = vi.hoisted(() => ({
  listContracts: vi.fn(),
}));

const documentsApi = vi.hoisted(() => ({
  listDocuments: vi.fn(),
}));

const notificationsApi = vi.hoisted(() => ({
  listNotifications: vi.fn(),
}));

const subscriptionsApi = vi.hoisted(() => ({
  getMySubscription: vi.fn(),
}));

const usersApi = vi.hoisted(() => ({
  getMyProfileCompletion: vi.fn(),
}));

vi.mock("@/shared/api/modules/posts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/posts")>()),
  listPosts: postsApi.listPosts,
}));

vi.mock("@/shared/api/modules/bids", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/bids")>()),
  listBids: bidsApi.listBids,
}));

vi.mock("@/shared/api/modules/contracts", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/contracts")>()),
  listContracts: contractsApi.listContracts,
}));

vi.mock("@/shared/api/modules/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/documents")>()),
  listDocuments: documentsApi.listDocuments,
}));

vi.mock("@/shared/api/modules/notifications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/notifications")>()),
  listNotifications: notificationsApi.listNotifications,
}));

vi.mock("@/shared/api/modules/subscriptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/subscriptions")>()),
  getMySubscription: subscriptionsApi.getMySubscription,
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  getMyProfileCompletion: usersApi.getMyProfileCompletion,
}));

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: {
        companyId: "company_123",
        email: "admin@cargo.test",
        firstName: "Ada",
        id: "user_123",
        isActive: true,
        lastName: "Admin",
        role: "COMPANY_ADMIN",
      },
    });

    postsApi.listPosts.mockResolvedValue([
      {
        companyId: "company_123",
        createdAt: new Date().toISOString(),
        createdByUserId: "user_123",
        currency: "EUR",
        deletedAt: null,
        hazmat: false,
        id: "post_123",
        isPromoted: false,
        priceType: "FIXED",
        routeId: "route_123",
        status: "OPEN",
        temperatureControlRequired: false,
        updatedAt: new Date().toISOString(),
      },
    ]);
    bidsApi.listBids.mockResolvedValue([
      {
        carrierCompanyId: "company_123",
        createdAt: new Date().toISOString(),
        createdByUserId: "user_123",
        currency: "EUR",
        deletedAt: null,
        id: "bid_123",
        post: {
          companyId: "shipper_123",
          currency: "EUR",
          deletedAt: null,
          id: "post_123",
          priceType: "FIXED",
          routeId: "route_123",
          status: "OPEN",
        },
        postId: "post_123",
        status: "PENDING",
        updatedAt: new Date().toISOString(),
      },
    ]);
    contractsApi.listContracts.mockResolvedValue([
      {
        acceptedBidId: "bid_123",
        agreedPriceAmount: "1000",
        carrierCompanyId: "company_123",
        createdAt: new Date().toISOString(),
        currency: "EUR",
        deletedAt: null,
        id: "contract_123",
        postId: "post_123",
        routeId: "route_123",
        shipperCompanyId: "shipper_123",
        status: "IN_PROGRESS",
        updatedAt: new Date().toISOString(),
      },
    ]);
    documentsApi.listDocuments.mockResolvedValue([{ createdAt: "", id: "doc_123", name: "Insurance" }]);
    notificationsApi.listNotifications.mockResolvedValue([{ body: "Body", createdAt: "", id: "notification_123", isRead: false, title: "Title", type: "BID_SUBMITTED" }]);
    subscriptionsApi.getMySubscription.mockResolvedValue({ cancelAtPeriodEnd: false, companyId: "company_123", endsAt: null, planCode: "FREE", startsAt: null, status: "FREE" });
    usersApi.getMyProfileCompletion.mockResolvedValue({ completedItems: [], missingItems: ["phone"], nextBestAction: "phone", percent: 75 });
  });

  it("renders live dashboard charts and stats", async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByRole("heading", { name: "7-day activity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Pipeline mix" })).toBeInTheDocument();
    expect(screen.getAllByText("Open posts").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pending bids").length).toBeGreaterThan(0);
    expect(screen.getByText("Accepted / active")).toBeInTheDocument();
    expect((await screen.findAllByText("75%")).length).toBeGreaterThan(0);
  });
});

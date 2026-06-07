import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { BillingPage } from "./BillingPage";

const plansApi = vi.hoisted(() => ({ listPlans: vi.fn() }));
const subscriptionApi = vi.hoisted(() => ({
  cancelSubscriptionAtPeriodEnd: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  getMySubscription: vi.fn(),
  revertSubscriptionCancel: vi.fn(),
}));
const billingEventsApi = vi.hoisted(() => ({ listBillingEvents: vi.fn() }));

vi.mock("@/shared/api/modules/plans", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/plans")>()),
  listPlans: plansApi.listPlans,
}));

vi.mock("@/shared/api/modules/subscriptions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/subscriptions")>()),
  cancelSubscriptionAtPeriodEnd: subscriptionApi.cancelSubscriptionAtPeriodEnd,
  createCheckoutSession: subscriptionApi.createCheckoutSession,
  createPortalSession: subscriptionApi.createPortalSession,
  getMySubscription: subscriptionApi.getMySubscription,
  revertSubscriptionCancel: subscriptionApi.revertSubscriptionCancel,
}));

vi.mock("@/shared/api/modules/billingEvents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/billingEvents")>()),
  listBillingEvents: billingEventsApi.listBillingEvents,
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

function renderBillingPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <BillingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BillingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    plansApi.listPlans.mockResolvedValue([
      {
        billingInterval: null,
        code: "FREE",
        currency: "EUR",
        features: { analytics: false, promotedPosts: false, routeAlerts: false },
        name: "Free",
        priceAmount: "0",
      },
      {
        billingInterval: "MONTHLY",
        code: "PRO",
        currency: "EUR",
        features: { analytics: true, promotedPosts: true, routeAlerts: true },
        name: "Pro",
        priceAmount: "49",
      },
    ]);
    subscriptionApi.getMySubscription.mockResolvedValue({ cancelAtPeriodEnd: false, companyId: "company_123", endsAt: null, planCode: "FREE", startsAt: null, status: "FREE" });
    billingEventsApi.listBillingEvents.mockResolvedValue([]);
  });

  it("shows subscription mutation controls to admins", async () => {
    useAuthStore.setState({ status: "authenticated", user: adminUser });

    renderBillingPage();

    expect(await screen.findByRole("button", { name: /start checkout/i }, { timeout: 3000 })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancel at period end/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /portal/i })).toBeInTheDocument();
  });

  it("keeps drivers in read-only billing mode", async () => {
    useAuthStore.setState({ status: "authenticated", user: driverUser });

    renderBillingPage();

    expect(await screen.findByText(/driver billing view is read-only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /start checkout/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel at period end/i })).not.toBeInTheDocument();
  });
});

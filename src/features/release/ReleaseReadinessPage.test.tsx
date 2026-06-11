import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { ReleaseReadinessPage } from "./ReleaseReadinessPage";

const deliveryApi = vi.hoisted(() => ({ getDeliveryStatus: vi.fn() }));
const billingReadinessApi = vi.hoisted(() => ({ getBillingReadiness: vi.fn() }));
const plansApi = vi.hoisted(() => ({ listPlans: vi.fn() }));
const subscriptionsApi = vi.hoisted(() => ({ getMySubscription: vi.fn() }));
const billingEventsApi = vi.hoisted(() => ({ listBillingEvents: vi.fn() }));

vi.mock("@/shared/api/modules/delivery", () => ({ getDeliveryStatus: deliveryApi.getDeliveryStatus }));
vi.mock("@/shared/api/modules/billingReadiness", () => billingReadinessApi);
vi.mock("@/shared/api/modules/plans", () => ({ listPlans: plansApi.listPlans }));
vi.mock("@/shared/api/modules/subscriptions", () => ({ getMySubscription: subscriptionsApi.getMySubscription }));
vi.mock("@/shared/api/modules/billingEvents", () => ({ listBillingEvents: billingEventsApi.listBillingEvents }));

const adminUser = {
  companyId: "company_123",
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
      <MemoryRouter>
        <ReleaseReadinessPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ReleaseReadinessPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    deliveryApi.getDeliveryStatus.mockResolvedValue({
      email: { configured: true, missing: [], mode: "provider", provider: "resend" },
      invites: { acceptUrlBase: "http://localhost:3000/invites/accept", configured: true, provider: "resend" },
      otp: { configured: true, previewEnabled: false, provider: "resend_email" },
      storage: { allowedMimeTypes: ["image/png"], configured: true, maxUploadBytes: 5_242_880, missing: [], provider: "s3" },
    });
    billingReadinessApi.getBillingReadiness.mockResolvedValue({
      bullmqEnabled: true,
      companyCreditPricesConfigured: true,
      jobSeekerCreditPricesConfigured: true,
      proPriceConfigured: true,
      stripeSecretConfigured: true,
      stripeWebhookSecretConfigured: true,
    });
    plansApi.listPlans.mockResolvedValue([]);
    subscriptionsApi.getMySubscription.mockResolvedValue(null);
    billingEventsApi.listBillingEvents.mockResolvedValue([]);
  });

  it("renders provider readiness and keeps external evidence as pending", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Release readiness" })).toBeInTheDocument();
    expect(screen.getByText("Provider configured")).toBeInTheDocument();
    expect(screen.getByText("RB-003 Stripe sandbox")).toBeInTheDocument();
    expect(screen.getByText("BullMQ worker mode")).toBeInTheDocument();
    expect(screen.getByText("RB-005 contract adoption")).toBeInTheDocument();
    expect(screen.getByText("External release evidence")).toBeInTheDocument();
    expect(screen.getByText("UAT-WEB-003")).toBeInTheDocument();
    expect(screen.getAllByText("Needs evidence").length).toBeGreaterThan(0);
  });

  it("blocks non-admin users", () => {
    useAuthStore.setState({ status: "authenticated", user: { ...adminUser, role: "COMPANY_DRIVER" } });

    renderPage();

    expect(screen.getByRole("heading", { name: "Admin-only release readiness" })).toBeInTheDocument();
    expect(deliveryApi.getDeliveryStatus).not.toHaveBeenCalled();
  });
});

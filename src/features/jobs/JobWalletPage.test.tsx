import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { JobWalletPage } from "./JobWalletPage";

const jobSeekerBillingApi = vi.hoisted(() => ({
  createJobSeekerCheckoutSession: vi.fn(),
  getJobSeekerUsage: vi.fn(),
  getJobSeekerWallet: vi.fn(),
  listJobSeekerCreditPacks: vi.fn(),
  listJobSeekerTransactions: vi.fn(),
}));
const billingReadinessApi = vi.hoisted(() => ({ getBillingReadiness: vi.fn() }));

vi.mock("@/shared/api/modules/jobSeekerBilling", () => jobSeekerBillingApi);
vi.mock("@/shared/api/modules/billingReadiness", () => billingReadinessApi);

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <JobWalletPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("JobWalletPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: {
        companyId: null,
        email: "job@cargo.test",
        firstName: "Jo",
        id: "user_job",
        isActive: true,
        lastName: "Seeker",
        role: "JOB_SEEKER",
      },
    });
    jobSeekerBillingApi.getJobSeekerWallet.mockResolvedValue({ balanceCredits: 4, updatedAt: "", userId: "user_job" });
    jobSeekerBillingApi.getJobSeekerUsage.mockResolvedValue({
      periodStart: "",
      quotas: {
        activeListings: { creditCostPerAction: 2, limit: 1, remaining: 1, used: 0 },
        applications: { creditCostPerAction: 1, limit: 3, remaining: 2, used: 1 },
        vehicleListings: { creditCostPerAction: 3, limit: 1, remaining: 1, used: 0 },
      },
      wallet: { balanceCredits: 4 },
    });
    jobSeekerBillingApi.listJobSeekerCreditPacks.mockResolvedValue([{ code: "JS_CREDITS_10", credits: 10, currency: "EUR", description: "10 job credits", id: "pack_1", isActive: true, name: "Starter", priceAmount: "4.99" }]);
    jobSeekerBillingApi.listJobSeekerTransactions.mockResolvedValue([]);
    billingReadinessApi.getBillingReadiness.mockResolvedValue({
      bullmqEnabled: true,
      companyCreditPricesConfigured: true,
      jobSeekerCreditPricesConfigured: true,
      proPriceConfigured: true,
      stripeSecretConfigured: true,
      stripeWebhookSecretConfigured: true,
    });
  });

  it("disables job wallet checkout when pack prices are missing", async () => {
    billingReadinessApi.getBillingReadiness.mockResolvedValue({
      bullmqEnabled: true,
      companyCreditPricesConfigured: true,
      jobSeekerCreditPricesConfigured: false,
      proPriceConfigured: true,
      stripeSecretConfigured: true,
      stripeWebhookSecretConfigured: true,
    });

    renderPage();

    expect(await screen.findByText(/job seeker credit pack stripe prices are missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy credits/i })).toBeDisabled();
  });
});

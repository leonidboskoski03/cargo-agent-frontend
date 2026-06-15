import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { CompanyCreditsPage } from "./CompanyCreditsPage";

const companyCreditsApi = vi.hoisted(() => ({
  createCompanyCreditCheckoutSession: vi.fn(),
  getCompanyCreditUsage: vi.fn(),
  getCompanyCreditWallet: vi.fn(),
  listCompanyCreditPacks: vi.fn(),
  listCompanyCreditTransactions: vi.fn(),
}));
const billingReadinessApi = vi.hoisted(() => ({ getBillingReadiness: vi.fn() }));

vi.mock("@/shared/api/modules/companyCredits", () => companyCreditsApi);
vi.mock("@/shared/api/modules/billingReadiness", () => billingReadinessApi);

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CompanyCreditsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("CompanyCreditsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: {
        companyId: "company_1",
        email: "admin@cargo.test",
        firstName: "Ada",
        id: "user_1",
        isActive: true,
        lastName: "Admin",
        role: "COMPANY_ADMIN",
      },
    });
    companyCreditsApi.getCompanyCreditWallet.mockResolvedValue({ balanceCredits: 8, companyId: "company_1", updatedAt: "" });
    companyCreditsApi.getCompanyCreditUsage.mockResolvedValue({
      companyId: "company_1",
      periodStart: "",
      quotas: {
        jobPosts: { creditCostPerAction: 2, limit: 3, remaining: 2, used: 1 },
        transportPosts: { creditCostPerAction: 2 },
        vehicleListings: { creditCostPerAction: 3, limit: 1, remaining: 1, used: 0 },
      },
      wallet: { balanceCredits: 8 },
    });
    companyCreditsApi.listCompanyCreditPacks.mockResolvedValue([{ code: "CO_CREDITS_10", credits: 10, currency: "EUR", id: "pack_1", isActive: true, name: "Starter", priceAmount: "4.99" }]);
    companyCreditsApi.listCompanyCreditTransactions.mockResolvedValue([]);
    billingReadinessApi.getBillingReadiness.mockResolvedValue({
      bullmqEnabled: true,
      companyCreditPricesConfigured: true,
      jobSeekerCreditPricesConfigured: true,
      proPriceConfigured: true,
      stripeSecretConfigured: true,
      stripeWebhookSecretConfigured: true,
    });
  });

  it("shows wallet balance, action costs, and admin buy controls", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Company credits" })).toBeInTheDocument();
    expect(screen.getByText("8 credits")).toBeInTheDocument();
    expect(screen.getAllByText(/2 credits/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /buy credits/i })).toBeInTheDocument();
    expect(await screen.findByText("Ready for sandbox")).toBeInTheDocument();
  });

  it("disables company credit checkout when pack prices are missing", async () => {
    billingReadinessApi.getBillingReadiness.mockResolvedValue({
      bullmqEnabled: true,
      companyCreditPricesConfigured: false,
      jobSeekerCreditPricesConfigured: true,
      proPriceConfigured: true,
      stripeSecretConfigured: true,
      stripeWebhookSecretConfigured: true,
    });

    renderPage();

    expect(await screen.findByText(/company credit pack stripe prices are missing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buy credits/i })).toBeDisabled();
  });

  it("shows friendly setup copy when company credit checkout fails", async () => {
    companyCreditsApi.createCompanyCreditCheckoutSession.mockRejectedValue(new Error("Missing company credit pack prices"));

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /buy credits/i }));

    expect(await screen.findByText(/company credit checkout is not ready yet/i)).toBeInTheDocument();
    expect(screen.queryByText("Missing company credit pack prices")).not.toBeInTheDocument();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { CompanyCreditsCheckoutPage } from "@/features/billing/CompanyCreditsCheckoutPage";
import { JobWalletCheckoutPage } from "./JobWalletCheckoutPage";

const jobBillingApi = vi.hoisted(() => ({ getJobSeekerCheckoutSession: vi.fn() }));
const companyCreditsApi = vi.hoisted(() => ({ getCompanyCreditCheckoutSession: vi.fn() }));

vi.mock("@/shared/api/modules/jobSeekerBilling", () => jobBillingApi);
vi.mock("@/shared/api/modules/companyCredits", () => companyCreditsApi);

function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<JobWalletCheckoutPage />} path="/job-wallet/checkout/:sessionId" />
          <Route element={<CompanyCreditsCheckoutPage />} path="/company-credits/checkout/:sessionId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("checkout status pages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders job seeker checkout status", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: { companyId: null, email: "job@test.local", firstName: "Job", id: "job_1", isActive: true, lastName: "Seeker", role: "JOB_SEEKER" },
    });
    jobBillingApi.getJobSeekerCheckoutSession.mockResolvedValue({
      amountCredits: 10,
      checkoutSessionId: "js_checkout_1",
      status: "COMPLETED",
      stripeCheckoutSessionId: "cs_test",
    });

    renderAt("/job-wallet/checkout/js_checkout_1");

    expect(await screen.findByRole("heading", { name: "Credit checkout" })).toBeInTheDocument();
    expect(screen.getByText("10 credits")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
  });

  it("renders company credit checkout status", async () => {
    useAuthStore.setState({
      status: "authenticated",
      user: { companyId: "company_1", email: "admin@test.local", firstName: "Ada", id: "admin_1", isActive: true, lastName: "Admin", role: "COMPANY_ADMIN" },
    });
    companyCreditsApi.getCompanyCreditCheckoutSession.mockResolvedValue({
      amountCredits: 30,
      checkoutSessionId: "co_checkout_1",
      status: "PENDING",
    });

    renderAt("/company-credits/checkout/co_checkout_1");

    expect(await screen.findByRole("heading", { name: "Company credit checkout" })).toBeInTheDocument();
    expect(screen.getByText("30 credits")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText(/waiting for stripe webhook processing/i)).toBeInTheDocument();
  });
});

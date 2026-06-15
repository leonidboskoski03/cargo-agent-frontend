import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { CompanyPage } from "./CompanyPage";

const companiesApi = vi.hoisted(() => ({
  deleteMyCompany: vi.fn(),
  getMyCompany: vi.fn(),
  requestMyCompanyVerification: vi.fn(),
  restoreCompany: vi.fn(),
  updateMyCompany: vi.fn(),
}));

vi.mock("@/shared/api/modules/companies", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/companies")>()),
  deleteMyCompany: companiesApi.deleteMyCompany,
  getMyCompany: companiesApi.getMyCompany,
  requestMyCompanyVerification: companiesApi.requestMyCompanyVerification,
  restoreCompany: companiesApi.restoreCompany,
  updateMyCompany: companiesApi.updateMyCompany,
}));

vi.mock("@/shared/api/modules/geo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/geo")>()),
  listSupportedCountries: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  getMyProfileCompletion: vi.fn().mockResolvedValue({ completedItems: [], missingItems: [], nextBestAction: null, percent: 0 }),
}));

const adminUser = {
  companyId: "company_1",
  email: "admin@cargo.test",
  firstName: "Ana",
  id: "user_admin",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <CompanyPage />
    </QueryClientProvider>,
  );
}

describe("CompanyPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: adminUser });
    companiesApi.restoreCompany.mockResolvedValue({});
    companiesApi.requestMyCompanyVerification.mockResolvedValue({});
  });

  it("shows a restore-only state for a deleted own company", async () => {
    companiesApi.getMyCompany.mockResolvedValue({
      city: "Skopje",
      companyType: "CARRIER",
      countryCode: "MK",
      deletedAt: "2026-06-13T00:00:00.000Z",
      id: "company_1",
      isVerified: false,
      name: "Deleted Carrier",
      registrationNumber: "REG-1",
      subscriptionStatus: "FREE",
      verificationStatus: "UNVERIFIED",
    });

    renderPage();

    expect((await screen.findAllByText("Deleted Carrier")).length).toBeGreaterThan(0);
    expect(screen.getByText("DELETED")).toBeInTheDocument();
    expect(screen.getByText("Company deleted")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save company/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete company/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /restore company/i }));
    expect(companiesApi.restoreCompany).toHaveBeenCalledWith("company_1", expect.anything());
  });

  it("lets admins request company verification", async () => {
    companiesApi.getMyCompany.mockResolvedValue({
      city: "Skopje",
      companyType: "CARRIER",
      countryCode: "MK",
      id: "company_1",
      isVerified: false,
      name: "Carrier One",
      registrationNumber: "REG-1",
      subscriptionStatus: "FREE",
      verificationStatus: "UNVERIFIED",
    });

    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: /run verification/i }));

    expect(companiesApi.requestMyCompanyVerification).toHaveBeenCalled();
  });
});

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { OnboardingPage } from "./OnboardingPage";

const companiesApi = vi.hoisted(() => ({
  getMyCompany: vi.fn(),
}));

const usersApi = vi.hoisted(() => ({
  getMe: vi.fn(),
  getMyProfileCompletion: vi.fn(),
}));

vi.mock("@/shared/api/modules/companies", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/companies")>()),
  getMyCompany: companiesApi.getMyCompany,
}));

vi.mock("@/shared/api/modules/users", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/users")>()),
  getMe: usersApi.getMe,
  getMyProfileCompletion: usersApi.getMyProfileCompletion,
}));

const companyUser = {
  companyId: "company_1",
  email: "admin@cargo.test",
  firstName: "Ana",
  id: "user_admin",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
};

const jobSeekerUser = {
  companyId: null,
  email: "driver@cargo.test",
  firstName: "Dina",
  id: "user_driver",
  isActive: true,
  lastName: "Driver",
  role: "JOB_SEEKER" as const,
};

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <OnboardingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("OnboardingPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows company setup steps from profile completion state", async () => {
    useAuthStore.setState({ status: "authenticated", user: companyUser });
    usersApi.getMe.mockResolvedValue(companyUser);
    usersApi.getMyProfileCompletion.mockResolvedValue({
      completedItems: ["firstName", "lastName", "phone", "emailVerified", "companyName", "companyType", "registrationNumber", "companyCountryCode", "companyCity"],
      missingItems: ["companyAddress", "companyWebsite"],
      nextBestAction: "companyAddress",
      percent: 78,
    });
    companiesApi.getMyCompany.mockResolvedValue({
      city: "Skopje",
      companyType: "CARRIER",
      countryCode: "MK",
      id: "company_1",
      isVerified: false,
      name: "Cargo Admin",
      registrationNumber: "REG",
      verificationStatus: "UNVERIFIED",
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Company setup" })).toBeInTheDocument();
    expect(screen.getByText((_, element) => element?.textContent === "78%")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /company basics/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /company profile enrichment/i })).toBeInTheDocument();
    expect(screen.getByText("2 missing")).toBeInTheDocument();
    expect(companiesApi.getMyCompany).toHaveBeenCalled();
  });

  it("shows driver setup without loading company state", async () => {
    useAuthStore.setState({ status: "authenticated", user: jobSeekerUser });
    usersApi.getMe.mockResolvedValue(jobSeekerUser);
    usersApi.getMyProfileCompletion.mockResolvedValue({
      completedItems: ["firstName", "lastName", "phone", "emailVerified"],
      missingItems: ["countryCode", "city", "headline", "preferredRoutes"],
      nextBestAction: "countryCode",
      percent: 45,
    });

    renderPage();

    expect(await screen.findByRole("heading", { name: "Driver setup" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /driver profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /availability and routes/i })).toBeInTheDocument();
    expect(companiesApi.getMyCompany).not.toHaveBeenCalled();
  });
});

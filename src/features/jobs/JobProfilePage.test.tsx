import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { JobProfilePage } from "./JobProfilePage";

const usersApi = vi.hoisted(() => ({
  getMe: vi.fn(),
  getMyProfileCompletion: vi.fn(),
  updateMyUser: vi.fn(),
}));
const documentsApi = vi.hoisted(() => ({ uploadDocument: vi.fn() }));
const walletApi = vi.hoisted(() => ({ getJobSeekerWallet: vi.fn() }));
const licensesApi = vi.hoisted(() => ({ createLicense: vi.fn(), listLicenses: vi.fn(), listLicenseTypes: vi.fn() }));
const jobsApi = vi.hoisted(() => ({ listMyJobApplications: vi.fn() }));
const vehicleApi = vi.hoisted(() => ({ listMyVehicleMarketplaceListings: vi.fn() }));
const vehiclesApi = vi.hoisted(() => ({ createVehicle: vi.fn(), deleteVehicle: vi.fn(), listVehicles: vi.fn() }));

vi.mock("@/shared/api/modules/users", () => usersApi);
vi.mock("@/shared/api/modules/documents", () => documentsApi);
vi.mock("@/shared/api/modules/jobSeekerBilling", () => walletApi);
vi.mock("@/shared/api/modules/licenses", () => licensesApi);
vi.mock("@/shared/api/modules/jobApplications", () => jobsApi);
vi.mock("@/shared/api/modules/vehicleMarketplace", () => vehicleApi);
vi.mock("@/shared/api/modules/vehicles", () => vehiclesApi);

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <JobProfilePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("JobProfilePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: {
        companyId: null,
        email: "driver@test.local",
        firstName: "Driver",
        id: "job_user_1",
        isActive: true,
        lastName: "One",
        role: "JOB_SEEKER",
      },
    });
    usersApi.getMe.mockResolvedValue({
      city: "Prilep",
      companyId: null,
      countryCode: "MK",
      email: "driver@test.local",
      firstName: "Driver",
      headline: "",
      id: "job_user_1",
      isActive: true,
      lastName: "One",
      phone: "",
      role: "JOB_SEEKER",
    });
    usersApi.getMyProfileCompletion.mockResolvedValue({ completedItems: ["firstName"], missingItems: ["headline"], nextBestAction: "headline", percent: 55 });
    usersApi.updateMyUser.mockResolvedValue({
      city: "Prilep",
      companyId: null,
      countryCode: "MK",
      email: "driver@test.local",
      firstName: "Driver",
      id: "job_user_1",
      imageUrl: "https://files.test/profile.jpg",
      isActive: true,
      lastName: "One",
      role: "JOB_SEEKER",
    });
    walletApi.getJobSeekerWallet.mockResolvedValue({ balanceCredits: 4, updatedAt: "", userId: "job_user_1" });
    licensesApi.listLicenses.mockResolvedValue([]);
    licensesApi.listLicenseTypes.mockResolvedValue([{ code: "CE", label: "CE truck license" }, { code: "ADR", label: "ADR hazmat" }]);
    licensesApi.createLicense.mockResolvedValue({ id: "license_1", isValid: true, licenseType: "CE", userId: "job_user_1" });
    documentsApi.uploadDocument.mockResolvedValue({ id: "doc_1", kind: "OTHER", mimeType: "image/png", name: "Upload", url: "https://files.test/upload.png" });
    jobsApi.listMyJobApplications.mockResolvedValue([]);
    vehiclesApi.listVehicles.mockResolvedValue([
      {
        countryOfRegistration: "MK",
        createdAt: "",
        id: "owned_vehicle_1",
        isActive: true,
        plateNumber: "PP-123-AB",
        updatedAt: "",
        vehicleType: "TRUCK",
      },
    ]);
    vehiclesApi.createVehicle.mockResolvedValue({ id: "owned_vehicle_2", plateNumber: "PP-456-CD", vehicleType: "TRUCK" });
    vehiclesApi.deleteVehicle.mockResolvedValue({ id: "owned_vehicle_1", plateNumber: "PP-123-AB", vehicleType: "TRUCK" });
    vehicleApi.listMyVehicleMarketplaceListings.mockResolvedValue([
      { city: "Prilep", countryCode: "MK", createdAt: "", id: "vehicle_listing_1", intent: "SALE", sourceType: "STANDALONE", status: "PUBLISHED", title: "MAN TGX", updatedAt: "", vehicleType: "TRUCK" },
      { city: "Prilep", countryCode: "MK", createdAt: "", id: "vehicle_listing_2", intent: "RENTAL", sourceType: "STANDALONE", status: "DRAFT", title: "Trailer", updatedAt: "", vehicleType: "TRAILER" },
    ]);
  });

  it("shows job seeker profile readiness and editable fields", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Job profile" })).toBeInTheDocument();
    expect(screen.getByText("55%")).toBeInTheDocument();
    expect(screen.getByText("Add a short driver headline.")).toBeInTheDocument();
    expect(screen.getByLabelText("Headline")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /add vehicle listing/i })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "My vehicles" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /publish ad/i })).toHaveAttribute("href", "/vehicle-marketplace/new?vehicleId=owned_vehicle_1");
    expect(screen.getByText("Published")).toBeInTheDocument();
    expect(screen.getByText("Drafts")).toBeInTheDocument();
    expect(await screen.findByText("CE truck license")).toBeInTheDocument();
  });

  it("lets job seekers add their own license", async () => {
    renderPage();

    await screen.findByText("CE truck license");
    await userEvent.selectOptions(screen.getByLabelText("License type"), "CE");
    await userEvent.type(screen.getByLabelText("Issued date"), "2026-01-01");
    await userEvent.type(screen.getByLabelText("Expiry date"), "2027-01-01");
    await userEvent.click(screen.getByRole("button", { name: /add license/i }));

    expect(licensesApi.createLicense.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      expiresAt: "2027-01-01",
      isValid: true,
      issuedAt: "2026-01-01",
      licenseType: "CE",
    }));
  });

  it("lets job seekers add an owned vehicle", async () => {
    renderPage();

    await screen.findByRole("heading", { name: "My vehicles" });
    await userEvent.type(screen.getByPlaceholderText("PP-123-AB"), "PP-456-CD");
    await userEvent.click(screen.getByRole("button", { name: /add vehicle/i }));

    expect(vehiclesApi.createVehicle.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      countryOfRegistration: "MK",
      isActive: true,
      plateNumber: "PP-456-CD",
      vehicleType: "TRUCK",
    }));
  });
});

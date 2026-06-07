import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { JobsPage } from "./JobsPage";

const jobApi = vi.hoisted(() => ({
  listJobApplications: vi.fn(),
  listMyJobApplications: vi.fn(),
  promoteJobApplication: vi.fn(),
}));

vi.mock("@/shared/api/modules/jobApplications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/jobApplications")>()),
  listJobApplications: jobApi.listJobApplications,
  listMyJobApplications: jobApi.listMyJobApplications,
  promoteJobApplication: jobApi.promoteJobApplication,
}));

const jobSeekerUser = {
  companyId: null,
  email: "seeker@cargo.test",
  firstName: "Jana",
  id: "user_seeker",
  isActive: true,
  lastName: "Seeker",
  role: "JOB_SEEKER" as const,
};

function renderPage(scope: "feed" | "mine" = "feed") {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <JobsPage scope={scope} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("JobsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({ status: "authenticated", user: jobSeekerUser });
    jobApi.listJobApplications.mockResolvedValue([
      {
        createdAt: "",
        createdByCompany: { id: "company_1", name: "Logi Trans" },
        createdByCompanyId: "company_1",
        createdByUserId: "company_user",
        currency: "EUR",
        description: "Regional routes and weekend flexibility.",
        expectedPayAmount: 1400,
        id: "job_1",
        isPromoted: true,
        preferredCity: "Skopje",
        preferredCountryCode: "MK",
        promotedUntil: null,
        status: "OPEN",
        title: "Driver for regional work",
        updatedAt: "",
      },
      {
        createdAt: "",
        createdByCompany: { id: "company_2", name: "Closed Co" },
        createdByCompanyId: "company_2",
        createdByUserId: "company_user_2",
        currency: "EUR",
        description: "",
        expectedPayAmount: null,
        id: "job_2",
        isPromoted: false,
        preferredCity: "Bitola",
        preferredCountryCode: "MK",
        promotedUntil: null,
        status: "CLOSED",
        title: "Closed listing",
        updatedAt: "",
      },
    ]);
    jobApi.listMyJobApplications.mockResolvedValue([]);
  });

  it("renders job listings with readable statuses and client filters", async () => {
    renderPage();

    expect(await screen.findByText("Driver for regional work")).toBeInTheDocument();
    expect(screen.getAllByText("Open").length).toBeGreaterThan(0);
    expect(screen.getByText("Logi Trans")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create listing/i })).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search jobs"), "closed");

    expect(screen.queryByText("Driver for regional work")).not.toBeInTheDocument();
    expect(screen.getByText("Closed listing")).toBeInTheDocument();
  });
});

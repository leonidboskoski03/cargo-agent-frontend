import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { JobsPage } from "./JobsPage";

const jobApi = vi.hoisted(() => ({
  deleteJobApplication: vi.fn(),
  listJobApplications: vi.fn(),
  listMyJobApplications: vi.fn(),
  promoteJobApplication: vi.fn(),
  restoreJobApplication: vi.fn(),
  updateJobApplication: vi.fn(),
}));

vi.mock("@/shared/api/modules/jobApplications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/jobApplications")>()),
  deleteJobApplication: jobApi.deleteJobApplication,
  listJobApplications: jobApi.listJobApplications,
  listMyJobApplications: jobApi.listMyJobApplications,
  promoteJobApplication: jobApi.promoteJobApplication,
  restoreJobApplication: jobApi.restoreJobApplication,
  updateJobApplication: jobApi.updateJobApplication,
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

const companyAdminUser = {
  companyId: "company_1",
  email: "admin@cargo.test",
  firstName: "Ada",
  id: "company_admin",
  isActive: true,
  lastName: "Admin",
  role: "COMPANY_ADMIN" as const,
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
    jobApi.updateJobApplication.mockResolvedValue({});
    jobApi.deleteJobApplication.mockResolvedValue({});
    jobApi.restoreJobApplication.mockResolvedValue({});
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

  it("splits active and deleted owner controls on my listings", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const activeJob = {
      createdAt: "",
      createdByCompany: null,
      createdByCompanyId: null,
      createdByUserId: jobSeekerUser.id,
      currency: "EUR",
      deletedAt: null,
      description: "Available for refrigerated routes.",
      expectedPayAmount: 1600,
      id: "job_owned",
      isPromoted: false,
      preferredCity: "Prilep",
      preferredCountryCode: "MK",
      promotedUntil: null,
      status: "OPEN",
      title: "Owner listing",
      updatedAt: "",
    };
    const deletedJob = {
      createdAt: "",
      createdByCompany: null,
      createdByCompanyId: null,
      createdByUserId: jobSeekerUser.id,
      currency: "EUR",
      deletedAt: "2026-06-08T00:00:00.000Z",
      description: "Old listing.",
      expectedPayAmount: null,
      id: "job_deleted",
      isPromoted: false,
      preferredCity: null,
      preferredCountryCode: null,
      promotedUntil: null,
      status: "CLOSED",
      title: "Deleted listing",
      updatedAt: "",
    };
    jobApi.listMyJobApplications.mockImplementation((params) =>
      Promise.resolve(params?.deleted === "only" ? [deletedJob] : [activeJob]),
    );

    renderPage("mine");

    expect(await screen.findByText("Owner listing")).toBeInTheDocument();
    expect(jobApi.listMyJobApplications).toHaveBeenCalledWith({ deleted: "active" });
    expect(screen.queryByText("Deleted listing")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit owner listing/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete owner listing/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /restore deleted listing/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /edit owner listing/i }));
    await userEvent.clear(screen.getByLabelText("Edit job title"));
    await userEvent.type(screen.getByLabelText("Edit job title"), "Updated owner listing");
    await userEvent.click(screen.getByRole("button", { name: /save owner listing/i }));

    expect(jobApi.updateJobApplication).toHaveBeenCalledWith("job_owned", expect.objectContaining({ title: "Updated owner listing" }));

    await userEvent.click(screen.getByRole("button", { name: /delete owner listing/i }));
    expect(jobApi.deleteJobApplication.mock.calls.at(-1)?.[0]).toBe("job_owned");

    await userEvent.click(screen.getByRole("button", { name: /^deleted$/i }));

    expect(await screen.findByText("Deleted listing")).toBeInTheDocument();
    expect(jobApi.listMyJobApplications).toHaveBeenCalledWith({ deleted: "only" });
    expect(screen.queryByText("Owner listing")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /edit deleted listing/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete deleted listing/i })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /restore deleted listing/i }));
    expect(jobApi.restoreJobApplication.mock.calls.at(-1)?.[0]).toBe("job_deleted");
  });

  it("lets company admins navigate to create company job posts", async () => {
    useAuthStore.setState({ status: "authenticated", user: companyAdminUser });
    jobApi.listJobApplications.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByRole("link", { name: /create job post/i })).toHaveAttribute("href", "/jobs/new");
  });
});

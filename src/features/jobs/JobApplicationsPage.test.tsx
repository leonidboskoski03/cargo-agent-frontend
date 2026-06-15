import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobApplicationsPage } from "./JobApplicationsPage";

const jobApi = vi.hoisted(() => ({
  listJobApplicationSubmissions: vi.fn(),
  listMyJobApplications: vi.fn(),
}));

vi.mock("@/shared/api/modules/jobApplications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/jobApplications")>()),
  listJobApplicationSubmissions: jobApi.listJobApplicationSubmissions,
  listMyJobApplications: jobApi.listMyJobApplications,
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <JobApplicationsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("JobApplicationsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    jobApi.listMyJobApplications.mockResolvedValue([
      {
        createdAt: "2026-06-13T00:00:00.000Z",
        createdByCompanyId: "company_1",
        createdByUserId: "owner_1",
        id: "job_1",
        status: "OPEN",
        title: "Regional driver",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ]);
    jobApi.listJobApplicationSubmissions.mockResolvedValue([
      {
        createdAt: "2026-06-13T00:00:00.000Z",
        documentName: "CV",
        documentUrl: "https://files.test/cv.pdf",
        id: "submission_1",
        jobApplicationId: "job_1",
        message: "Available next week.",
        status: "PENDING",
        submittedByUser: { firstName: "Jana", id: "seeker_1", lastName: "Driver" },
        submittedByUserId: "seeker_1",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ]);
  });

  it("lists incoming applications for owned job posts", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Applications" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Regional driver" })).toHaveAttribute("href", "/jobs/job_1");
    expect(screen.getByText("Jana Driver")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CV" })).toHaveAttribute("href", "https://files.test/cv.pdf");
  });
});

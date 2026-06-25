import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JobApplicationsPage } from "./JobApplicationsPage";

const jobApi = vi.hoisted(() => ({
  createJobApplicationSubmissionReply: vi.fn(),
  listJobApplicationSubmissionReplies: vi.fn(),
  listJobApplicationSubmissions: vi.fn(),
  listMyJobApplications: vi.fn(),
}));

vi.mock("@/shared/api/modules/jobApplications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/jobApplications")>()),
  createJobApplicationSubmissionReply: jobApi.createJobApplicationSubmissionReply,
  listJobApplicationSubmissionReplies: jobApi.listJobApplicationSubmissionReplies,
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
    jobApi.createJobApplicationSubmissionReply.mockResolvedValue({
      authorCompanyId: "company_1",
      authorUserId: "owner_1",
      createdAt: "2026-06-13T00:05:00.000Z",
      id: "submission_reply_created",
      message: "Thanks, noted.",
      submissionId: "submission_1",
      updatedAt: "2026-06-13T00:05:00.000Z",
    });
    jobApi.listJobApplicationSubmissionReplies.mockResolvedValue([]);
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
      {
        createdAt: "2026-06-14T00:00:00.000Z",
        documentName: null,
        documentUrl: null,
        id: "submission_2",
        jobApplicationId: "job_1",
        message: "Can start after current route.",
        status: "ACCEPTED",
        submittedByUser: { firstName: "Marko", id: "seeker_2", lastName: "Pilot" },
        submittedByUserId: "seeker_2",
        updatedAt: "2026-06-14T00:00:00.000Z",
      },
    ]);
  });

  it("lists incoming applications for owned job posts", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Applications" })).toBeInTheDocument();
    expect(screen.getByText("Application queue")).toBeInTheDocument();
    expect(screen.getByText("Submitted Jun 13, 2026")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Regional driver" })[0]).toHaveAttribute("href", "/jobs/job_1");
    expect(screen.getByText("Jana Driver")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "CV" })).toHaveAttribute("href", "https://files.test/cv.pdf");

    await userEvent.click(screen.getByRole("button", { name: /^filters$/i }));
    expect(await screen.findByRole("dialog", { name: /application filters/i })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Document"), "NO_DOCUMENT");
    await userEvent.click(screen.getByRole("button", { name: /^apply$/i }));

    expect(screen.queryByText("Jana Driver")).not.toBeInTheDocument();
    expect(screen.getByText("Marko Pilot")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /^clear$/i }));
    expect(await screen.findByText("Jana Driver")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search applications"), "current route");

    expect(screen.queryByText("Jana Driver")).not.toBeInTheDocument();
    expect(screen.getByText("Marko Pilot")).toBeInTheDocument();
  });

  it("sends a reply from an application card", async () => {
    renderPage();

    const composers = await screen.findAllByLabelText("Application replies message");
    await userEvent.type(composers[0], "Thanks, noted.");
    await userEvent.click(screen.getAllByRole("button", { name: /^send$/i })[0]);

    expect(jobApi.createJobApplicationSubmissionReply).toHaveBeenCalledWith("submission_1", { message: "Thanks, noted." });
  });
});

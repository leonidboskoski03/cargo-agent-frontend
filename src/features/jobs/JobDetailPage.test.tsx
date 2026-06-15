import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/features/auth/authStore";
import { JobDetailPage } from "./JobDetailPage";

const documentsApi = vi.hoisted(() => ({ uploadDocument: vi.fn() }));
const jobApi = vi.hoisted(() => ({
  applyToJobApplication: vi.fn(),
  listJobApplications: vi.fn(),
  listJobApplicationSubmissions: vi.fn(),
  listMyJobApplications: vi.fn(),
  promoteJobApplication: vi.fn(),
  promoteJobApplicationSubmission: vi.fn(),
}));

vi.mock("@/shared/api/modules/documents", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/documents")>()),
  uploadDocument: documentsApi.uploadDocument,
}));

vi.mock("@/shared/api/modules/jobApplications", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api/modules/jobApplications")>()),
  applyToJobApplication: jobApi.applyToJobApplication,
  listJobApplications: jobApi.listJobApplications,
  listJobApplicationSubmissions: jobApi.listJobApplicationSubmissions,
  listMyJobApplications: jobApi.listMyJobApplications,
  promoteJobApplication: jobApi.promoteJobApplication,
  promoteJobApplicationSubmission: jobApi.promoteJobApplicationSubmission,
}));

function renderPage() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={["/jobs/job_1"]}>
        <Routes>
          <Route element={<JobDetailPage />} path="/jobs/:jobApplicationId" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("JobDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      status: "authenticated",
      user: {
        companyId: null,
        email: "seeker@cargo.test",
        firstName: "Jana",
        id: "seeker_1",
        isActive: true,
        lastName: "Driver",
        role: "JOB_SEEKER",
      },
    });
    jobApi.listJobApplications.mockResolvedValue([
      {
        createdAt: "2026-06-13T00:00:00.000Z",
        createdByCompany: { id: "company_1", name: "Logi Trans" },
        createdByCompanyId: "company_1",
        createdByUserId: "company_user",
        id: "job_1",
        status: "OPEN",
        title: "Regional driver",
        updatedAt: "2026-06-13T00:00:00.000Z",
      },
    ]);
    jobApi.listMyJobApplications.mockResolvedValue([]);
    documentsApi.uploadDocument.mockResolvedValue({ id: "doc_1", name: "CV", type: "OTHER", url: "https://files.test/cv.pdf" });
    jobApi.applyToJobApplication.mockResolvedValue({
      createdAt: "2026-06-13T00:00:00.000Z",
      documentName: "CV",
      documentUrl: "https://files.test/cv.pdf",
      id: "submission_1",
      jobApplicationId: "job_1",
      status: "PENDING",
      submittedByUserId: "seeker_1",
      updatedAt: "2026-06-13T00:00:00.000Z",
    });
  });

  it("uploads a named CV document before applying", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Regional driver" })).toBeInTheDocument();
    await userEvent.upload(
      screen.getByLabelText(/select file to upload/i),
      new File(["cv"], "jana-cv.pdf", { type: "application/pdf" }),
    );
    await userEvent.type(screen.getByLabelText(/message/i), "I can start next week.");
    await userEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(documentsApi.uploadDocument).toHaveBeenCalledWith(expect.objectContaining({
      fileName: "jana-cv.pdf",
      kind: "OTHER",
      mimeType: "application/pdf",
      name: "CV",
    }));
    expect(jobApi.applyToJobApplication).toHaveBeenCalledWith("job_1", expect.objectContaining({
      documentName: "CV",
      documentUrl: "https://files.test/cv.pdf",
      message: "I can start next week.",
    }));
  });
});

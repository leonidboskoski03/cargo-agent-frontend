import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type JobApplicationStatus = "OPEN" | "CLOSED" | "FILLED" | string;

export type JobApplicationRecord = {
  createdByCompany?: {
    city?: string | null;
    countryCode?: string | null;
    id: string;
    name: string;
  } | null;
  createdByCompanyId?: string | null;
  createdByUser?: {
    email?: string | null;
    firstName?: string | null;
    id: string;
    lastName?: string | null;
    role?: string;
  } | null;
  countryCode?: string | null;
  createdAt: string;
  createdByUserId: string;
  currency?: string | null;
  deletedAt?: string | null;
  description?: string | null;
  expectedPayAmount?: number | string | null;
  id: string;
  isPromoted?: boolean;
  preferredCity?: string | null;
  preferredCountryCode?: string | null;
  promotedUntil?: string | null;
  status: JobApplicationStatus;
  title: string;
  updatedAt: string;
};

export type JobApplicationSubmissionRecord = {
  billing?: {
    creditCost: number;
    freeMonthlyLimit: number;
    mode: "FREE_QUOTA" | "CREDITS";
    remainingFreeApplications: number;
    usedThisMonth: number;
    walletBalanceCredits: number;
  };
  createdAt: string;
  deletedAt?: string | null;
  id: string;
  isPromoted?: boolean;
  jobApplicationId: string;
  message?: string | null;
  promotedUntil?: string | null;
  status?: string;
  submittedByCompany?: {
    id: string;
    name: string;
  } | null;
  submittedByCompanyId?: string | null;
  submittedByUser?: {
    email?: string | null;
    firstName?: string | null;
    id: string;
    lastName?: string | null;
    role?: string;
  } | null;
  submittedByUserId: string;
  updatedAt: string;
};

export type CreateJobApplicationInput = {
  currency?: string;
  description?: string;
  expectedPayAmount?: number;
  preferredCity?: string;
  preferredCountryCode?: string;
  title: string;
};

export type ApplyToJobApplicationInput = {
  message?: string;
};

export function listJobApplications(params?: { city?: string; countryCode?: string; page?: number; pageSize?: number; q?: string; status?: string }) {
  return unwrapData<JobApplicationRecord[]>(apiClient.get("/job-applications", { params }));
}

export function listMyJobApplications() {
  return unwrapData<JobApplicationRecord[]>(apiClient.get("/job-applications/mine"));
}

export function createJobApplication(input: CreateJobApplicationInput) {
  return unwrapData<JobApplicationRecord>(apiClient.post("/job-applications", input));
}

export function promoteJobApplication(jobApplicationId: string) {
  return unwrapData<JobApplicationRecord>(apiClient.post(`/job-applications/${jobApplicationId}/promote`, {}));
}

export function applyToJobApplication(jobApplicationId: string, input: ApplyToJobApplicationInput) {
  return unwrapData<JobApplicationSubmissionRecord>(apiClient.post(`/job-applications/${jobApplicationId}/apply`, input));
}

export function promoteJobApplicationSubmission(jobApplicationId: string, submissionId: string) {
  return unwrapData<JobApplicationSubmissionRecord>(apiClient.post(`/job-applications/${jobApplicationId}/submissions/${submissionId}/promote`, {}));
}

export function listJobApplicationSubmissions(jobApplicationId: string) {
  return unwrapData<JobApplicationSubmissionRecord[]>(apiClient.get(`/job-applications/${jobApplicationId}/submissions`));
}

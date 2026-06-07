import type { JobApplicationRecord, JobApplicationSubmissionRecord } from "@/shared/api/modules/jobApplications";

export function formatJobLocation(job: JobApplicationRecord) {
  const city = job.preferredCity;
  const country = job.preferredCountryCode ?? job.countryCode;
  return [city, country].filter(Boolean).join(", ") || "Flexible location";
}

export function formatJobPay(job: JobApplicationRecord) {
  if (!job.expectedPayAmount) return "Pay not listed";
  return `${job.expectedPayAmount} ${job.currency ?? ""}`.trim();
}

export function formatJobOwner(job: JobApplicationRecord) {
  if (job.createdByCompany?.name) return job.createdByCompany.name;
  const userName = [job.createdByUser?.firstName, job.createdByUser?.lastName].filter(Boolean).join(" ");
  return userName || "Independent job seeker";
}

export function formatSubmissionOwner(submission: JobApplicationSubmissionRecord) {
  if (submission.submittedByCompany?.name) return submission.submittedByCompany.name;
  const userName = [submission.submittedByUser?.firstName, submission.submittedByUser?.lastName].filter(Boolean).join(" ");
  return userName || submission.submittedByUser?.email || submission.submittedByUserId.slice(0, 8);
}

export function jobStatusTone(status?: string | null) {
  if (status === "OPEN") return "success";
  if (status === "CLOSED" || status === "REJECTED" || status === "WITHDRAWN") return "danger";
  if (status === "PAUSED" || status === "PENDING") return "warning";
  return "neutral";
}

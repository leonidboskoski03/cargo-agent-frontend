import { useQueries, useQuery } from "@tanstack/react-query";
import { BriefcaseBusiness } from "lucide-react";
import { Link } from "react-router-dom";
import { listJobApplicationSubmissions, listMyJobApplications, type JobApplicationRecord, type JobApplicationSubmissionRecord } from "@/shared/api/modules/jobApplications";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { humanizeEnum } from "@/shared/lib/formatters";
import { formatSubmissionOwner, jobStatusTone } from "./jobFormatters";

type SubmissionRow = {
  job: JobApplicationRecord;
  submission: JobApplicationSubmissionRecord;
};

export function JobApplicationsPage() {
  const jobsQuery = useQuery({
    queryFn: () => listMyJobApplications({ deleted: "active" }),
    queryKey: ["job-applications", "mine", "applications"],
  });
  const jobs = jobsQuery.data ?? [];
  const submissionQueries = useQueries({
    queries: jobs.map((job) => ({
      enabled: Boolean(job.id),
      queryFn: () => listJobApplicationSubmissions(job.id),
      queryKey: ["job-applications", job.id, "submissions"],
    })),
  });

  if (jobsQuery.isLoading) {
    return <LoadingState description="Loading your job posts before checking incoming applications." title="Loading applications" />;
  }

  const submissionLoading = submissionQueries.some((query) => query.isLoading);
  if (submissionLoading) {
    return <LoadingState description="Loading incoming applications for your job posts." title="Loading applications" />;
  }

  const error = jobsQuery.error ?? submissionQueries.find((query) => query.error)?.error;
  if (error) {
    return <ErrorState description="Incoming job applications could not be loaded." error={error} title="Unable to load applications" />;
  }

  const rows: SubmissionRow[] = jobs.flatMap((job, index) =>
    (submissionQueries[index]?.data ?? []).map((submission) => ({ job, submission })),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Job marketplace"
        subtitle="Review submissions sent to job posts and independent listings you own."
        title="Applications"
      />

      <Surface>
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
            <BriefcaseBusiness className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Incoming applications</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Applications are grouped from your active job posts. Open the source listing to manage the full submission thread.
            </p>
          </div>
        </div>
      </Surface>

      {rows.length === 0 ? (
        <EmptyState
          description={jobs.length === 0 ? "Create a job post or listing before applications can arrive here." : "Applications submitted to your job posts will appear here."}
          title="No applications yet"
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Listing</Th>
              <Th>Submitted by</Th>
              <Th>Message</Th>
              <Th>Document</Th>
              <Th>Status</Th>
              <Th>Date</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ job, submission }) => (
              <tr key={submission.id}>
                <Td>
                  <Link className="font-semibold text-primary" to={`/jobs/${job.id}`}>
                    {job.title}
                  </Link>
                </Td>
                <Td>{formatSubmissionOwner(submission)}</Td>
                <Td>{submission.message ?? "No message"}</Td>
                <Td>
                  {submission.documentUrl ? (
                    <a className="font-semibold text-primary" href={submission.documentUrl} rel="noreferrer" target="_blank">
                      {submission.documentName ?? "Document"}
                    </a>
                  ) : "No document"}
                </Td>
                <Td><StatusBadge tone={jobStatusTone(submission.status)}>{humanizeEnum(submission.status ?? "PENDING")}</StatusBadge></Td>
                <Td>{submission.createdAt.slice(0, 10)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

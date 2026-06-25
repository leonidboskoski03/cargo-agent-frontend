import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CalendarDays, FileText, Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  createJobApplicationSubmissionReply,
  listJobApplicationSubmissionReplies,
  listJobApplicationSubmissions,
  listMyJobApplications,
  type JobApplicationRecord,
  type JobApplicationSubmissionRecord,
} from "@/shared/api/modules/jobApplications";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { FilterPopover } from "@/shared/components/ui/FilterPopover";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { WorkflowReplyThread } from "@/shared/components/ui/WorkflowReplyThread";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { formatSubmissionOwner, jobStatusTone } from "./jobFormatters";

type SubmissionRow = {
  job: JobApplicationRecord;
  submission: JobApplicationSubmissionRecord;
};

const submissionStatuses = ["ALL", "PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"] as const;
const documentFilters = ["ALL", "WITH_DOCUMENT", "NO_DOCUMENT"] as const;

function formatDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function SubmissionReplyPanel({ submission }: { submission: JobApplicationSubmissionRecord }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const repliesQuery = useQuery({
    queryFn: () => listJobApplicationSubmissionReplies(submission.id),
    queryKey: ["job-applications", "submissions", submission.id, "replies"],
  });
  const replyMutation = useAppMutation({
    messages: { success: "Reply sent" },
    mutationFn: (message: string) => createJobApplicationSubmissionReply(submission.id, { message }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["job-applications", "submissions", submission.id, "replies"] }),
  });

  return (
    <WorkflowReplyThread
      currentCompanyId={user?.companyId}
      currentUserId={user?.id}
      error={repliesQuery.error}
      isLoading={repliesQuery.isLoading}
      isSending={replyMutation.isPending}
      onSend={(message) => replyMutation.mutate(message)}
      replies={repliesQuery.data}
      title="Application replies"
    />
  );
}

export function JobApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "ALL";
  const document = searchParams.get("document") ?? "ALL";
  const search = searchParams.get("q") ?? "";
  const [draftFilters, setDraftFilters] = useState({ document, status });
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

  useEffect(() => {
    setDraftFilters({ document, status });
  }, [document, status]);

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
  const filteredRows = rows.filter(({ job, submission }) => {
    const needle = search.trim().toLowerCase();
    const submissionStatus = submission.status ?? "PENDING";
    const hasDocument = Boolean(submission.documentUrl);
    const matchesStatus = status === "ALL" || submissionStatus === status;
    const matchesDocument = document === "ALL" || (document === "WITH_DOCUMENT" ? hasDocument : !hasDocument);
    const haystack = `${job.title} ${submission.message ?? ""} ${formatSubmissionOwner(submission)} ${submission.documentName ?? ""}`.toLowerCase();
    return matchesStatus && matchesDocument && (!needle || haystack.includes(needle));
  });

  const updateFilter = (key: "document" | "q" | "status", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const applyFilters = () => {
    const next = new URLSearchParams(searchParams);
    if (draftFilters.status && draftFilters.status !== "ALL") next.set("status", draftFilters.status);
    else next.delete("status");
    if (draftFilters.document && draftFilters.document !== "ALL") next.set("document", draftFilters.document);
    else next.delete("document");
    setSearchParams(next);
  };

  const clearFilters = () => {
    setDraftFilters({ document: "ALL", status: "ALL" });
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = [status !== "ALL" ? status : "", document !== "ALL" ? document : ""].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Job marketplace"
        subtitle="Review submissions sent to job posts and independent listings you own."
        title="Applications"
      />

      <Surface>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
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
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Field label="Search applications">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input className="pl-9" onChange={(event) => updateFilter("q", event.target.value)} placeholder="Applicant, listing, message" value={search} />
              </div>
            </Field>
            <div className="flex gap-2">
              <FilterPopover
                activeCount={activeFilterCount}
                description="Filter incoming applications by review status and attached document."
                onApply={applyFilters}
                onClear={clearFilters}
                title="Application filters"
              >
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase text-muted">Submission filters</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Status">
                      <Select onChange={(event) => setDraftFilters((current) => ({ ...current, status: event.target.value }))} value={draftFilters.status}>
                        {submissionStatuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : humanizeEnum(item)}</option>)}
                      </Select>
                    </Field>
                    <Field label="Document">
                      <Select onChange={(event) => setDraftFilters((current) => ({ ...current, document: event.target.value }))} value={draftFilters.document}>
                        {documentFilters.map((item) => <option key={item} value={item}>{item === "ALL" ? "Any document state" : humanizeEnum(item)}</option>)}
                      </Select>
                    </Field>
                  </div>
                </section>
              </FilterPopover>
              <Button onClick={clearFilters} type="button" variant="secondary">Clear</Button>
            </div>
          </div>
        </div>
      </Surface>

      {filteredRows.length === 0 ? (
        <EmptyState
          description={rows.length === 0 ? jobs.length === 0 ? "Create a job post or listing before applications can arrive here." : "Applications submitted to your job posts will appear here." : "No applications match the current filters."}
          title={rows.length === 0 ? "No applications yet" : "No matching applications"}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Application queue</p>
            <p className="mt-1 text-sm text-muted">Incoming submissions with applicant, document, status, and source listing context.</p>
          </div>
          <div className="divide-y divide-border">
            {filteredRows.map(({ job, submission }) => (
              <article className="px-4 py-4 transition hover:bg-surface-pearl" key={submission.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        Submitted {formatDate(submission.createdAt)}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span className="inline-flex items-center gap-1">
                        <UserRound className="size-3.5" aria-hidden="true" />
                        {formatSubmissionOwner(submission)}
                      </span>
                    </div>
                    <Link className="mt-3 block text-lg font-semibold leading-6 text-foreground transition hover:text-primary" to={`/jobs/${job.id}`}>
                      {job.title}
                    </Link>
                    <p className="mt-2 line-clamp-2 max-w-4xl text-sm leading-6 text-foreground">{submission.message ?? "No message"}</p>
                  </div>
                  <StatusBadge tone={jobStatusTone(submission.status)}>{humanizeEnum(submission.status ?? "PENDING")}</StatusBadge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
                  {submission.documentUrl ? (
                    <a className="inline-flex items-center gap-1.5 font-semibold text-primary" href={submission.documentUrl} rel="noreferrer" target="_blank">
                      <FileText className="size-4" aria-hidden="true" />
                      {submission.documentName ?? "Document"}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <FileText className="size-4" aria-hidden="true" />
                      No document
                    </span>
                  )}
                </div>
                <SubmissionReplyPanel submission={submission} />
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

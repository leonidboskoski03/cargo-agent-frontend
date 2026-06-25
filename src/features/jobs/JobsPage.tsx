import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, CalendarDays, MapPin, Pencil, Plus, RotateCcw, Save, Search, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  deleteJobApplication,
  listJobApplications,
  listMyJobApplications,
  promoteJobApplication,
  restoreJobApplication,
  updateJobApplication,
  type JobApplicationRecord,
} from "@/shared/api/modules/jobApplications";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { FilterPopover } from "@/shared/components/ui/FilterPopover";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { Tooltip } from "@/shared/components/ui/Tooltip";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { formatJobLocation, formatJobOwner, formatJobPay, jobStatusTone } from "./jobFormatters";

type JobsPageProps = {
  scope?: "feed" | "mine";
};

const jobStatuses = ["ALL", "OPEN", "PAUSED", "CLOSED"] as const;

function formatPostedDate(value?: string | null) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

export function JobsPage({ scope = "feed" }: JobsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", expectedPayAmount: "", preferredCity: "", preferredCountryCode: "", title: "" });
  const [registryView, setRegistryView] = useState<"active" | "deleted">("active");
  const isMine = scope === "mine";
  const isDeletedView = registryView === "deleted";
  const query = useQuery({
    queryFn: isMine ? () => listMyJobApplications({ deleted: isDeletedView ? "only" : "active" }) : () => listJobApplications(),
    queryKey: ["job-applications", scope, isMine ? registryView : "feed"],
  });
  const jobs = query.data ?? [];
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "ALL";
  const [draftFilters, setDraftFilters] = useState({ status });
  const filteredJobs = jobs.filter((job) => {
    const needle = q.trim().toLowerCase();
    const matchesStatus = status === "ALL" || job.status === status;
    const haystack = `${job.title} ${job.description ?? ""} ${formatJobLocation(job)} ${formatJobOwner(job)}`.toLowerCase();
    return matchesStatus && (!needle || haystack.includes(needle));
  });

  useEffect(() => {
    setDraftFilters({ status });
  }, [status]);

  const promoteMutation = useAppMutation({
    messages: { success: "Job listing promoted" },
    mutationFn: promoteJobApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["job-applications"] });
    },
  });
  const updateMutation = useAppMutation({
    messages: { success: "Job listing updated" },
    mutationFn: ({ id, values }: { id: string; values: typeof editForm }) =>
      updateJobApplication(id, {
        description: values.description.trim() || null,
        expectedPayAmount: values.expectedPayAmount ? Number(values.expectedPayAmount) : null,
        preferredCity: values.preferredCity.trim() || null,
        preferredCountryCode: values.preferredCountryCode.trim() ? values.preferredCountryCode.trim().toUpperCase() : null,
        title: values.title.trim(),
      }),
    onSuccess: () => {
      setEditingJobId(null);
      void queryClient.invalidateQueries({ queryKey: ["job-applications"] });
    },
  });
  const statusMutation = useAppMutation({
    messages: { success: "Job listing status updated" },
    mutationFn: ({ id, status }: { id: string; status: "OPEN" | "PAUSED" | "CLOSED" }) => updateJobApplication(id, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["job-applications"] }),
  });
  const deleteMutation = useAppMutation({
    messages: { success: "Job listing deleted" },
    mutationFn: deleteJobApplication,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["job-applications"] }),
  });
  const restoreMutation = useAppMutation({
    messages: { success: "Job listing restored" },
    mutationFn: restoreJobApplication,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["job-applications"] }),
  });

  const startEdit = (job: JobApplicationRecord) => {
    setEditingJobId(job.id);
    setEditForm({
      description: job.description ?? "",
      expectedPayAmount: job.expectedPayAmount ? String(job.expectedPayAmount) : "",
      preferredCity: job.preferredCity ?? "",
      preferredCountryCode: job.preferredCountryCode ?? "",
      title: job.title,
    });
  };

  const updateFilter = (key: "q" | "status", value: string) => {
    const next = new URLSearchParams(searchParams);
    if (!value || value === "ALL") next.delete(key);
    else next.set(key, value);
    setSearchParams(next);
  };

  const applyFilters = () => {
    updateFilter("status", draftFilters.status);
  };

  const clearFilters = () => {
    setDraftFilters({ status: "ALL" });
    setSearchParams(new URLSearchParams());
  };

  const activeFilterCount = [status !== "ALL" ? status : ""].filter(Boolean).length;

  if (query.isLoading) {
    return <LoadingState description="Loading job marketplace listings and promotion state." title="Loading jobs" />;
  }

  if (query.error) {
    return <ErrorState description="The job marketplace could not be loaded." error={query.error} title="Unable to load jobs" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        action={
          user?.role === "JOB_SEEKER" || user?.role === "COMPANY_ADMIN" ? (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" to="/jobs/new">
              <Plus className="size-4" aria-hidden="true" />
              {user.role === "COMPANY_ADMIN" ? "Create job post" : "Create listing"}
            </Link>
          ) : null
        }
        eyebrow="Job marketplace"
        subtitle={isMine ? "Manage your job-seeker listings and promotion state." : "Browse lane-aware job marketplace listings returned by the backend."}
        title={isMine ? "My job listings" : "Jobs"}
      />

      <Surface>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="w-full max-w-xl">
            <Field label="Search jobs">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <Input className="pl-9" onChange={(event) => updateFilter("q", event.target.value)} placeholder="Title, company, city" value={q} />
              </div>
            </Field>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <FilterPopover
              activeCount={activeFilterCount}
              description={isMine ? "Filter your job listing registry by current publishing status." : "Filter job marketplace listings by current availability."}
              onApply={applyFilters}
              onClear={clearFilters}
              title={isMine ? "Job listing filters" : "Job marketplace filters"}
            >
              <section className="space-y-3">
                <h3 className="text-sm font-semibold uppercase text-muted">Listing filters</h3>
                <Field label="Status">
                  <Select onChange={(event) => setDraftFilters({ status: event.target.value })} value={draftFilters.status}>
                    {jobStatuses.map((item) => <option key={item} value={item}>{item === "ALL" ? "All statuses" : humanizeEnum(item)}</option>)}
                  </Select>
                </Field>
              </section>
            </FilterPopover>
            <Button onClick={clearFilters} type="button" variant="secondary">Clear</Button>
          </div>
        </div>
        {isMine ? (
          <div className="mt-4 inline-flex w-fit rounded-lg border border-border bg-surface-pearl p-1" aria-label="Job listing registry view">
            <Button
              aria-pressed={!isDeletedView}
              className="min-h-8 px-3 py-1 text-sm"
              onClick={() => {
                setEditingJobId(null);
                setRegistryView("active");
              }}
              type="button"
              variant={!isDeletedView ? "secondary" : "ghost"}
            >
              Active
            </Button>
            <Button
              aria-pressed={isDeletedView}
              className="min-h-8 px-3 py-1 text-sm"
              onClick={() => {
                setEditingJobId(null);
                setRegistryView("deleted");
              }}
              type="button"
              variant={isDeletedView ? "secondary" : "ghost"}
            >
              Deleted
            </Button>
          </div>
        ) : null}
      </Surface>

      {filteredJobs.length === 0 ? (
        <EmptyState
          action={user?.role === "JOB_SEEKER" ? <Link className="text-sm font-semibold text-primary" to="/jobs/new">Create your first listing</Link> : null}
          description={jobs.length === 0 ? isDeletedView ? "Deleted job listings will appear here after you remove them from the active registry." : "No job listings are available for your lane yet." : "No jobs match the current filters."}
          title={jobs.length === 0 ? isDeletedView ? "No deleted jobs yet" : "No jobs yet" : "No matching jobs"}
        />
      ) : !isMine ? (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Best job matches</p>
            <p className="mt-1 text-sm text-muted">Lane-aware marketplace listings, ordered by promotion and backend relevance.</p>
          </div>
          <div className="divide-y divide-border">
            {filteredJobs.map((job) => (
              <article className="group px-4 py-4 transition hover:bg-surface-pearl" key={job.id}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" aria-hidden="true" />
                        Posted {formatPostedDate(job.createdAt)}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>{formatJobPay(job)}</span>
                      {job.isPromoted ? (
                        <>
                          <span aria-hidden="true">•</span>
                          <span className="font-semibold text-primary">Promoted</span>
                        </>
                      ) : null}
                    </div>
                    <Link className="mt-3 block text-lg font-semibold leading-6 text-foreground transition group-hover:text-primary" to={`/jobs/${job.id}`}>
                      {job.title}
                    </Link>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-4" aria-hidden="true" />
                        {formatJobOwner(job)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="size-4" aria-hidden="true" />
                        {formatJobLocation(job)}
                      </span>
                    </div>
                  </div>
                  <Link className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-primary bg-card px-3 py-2 text-sm font-semibold text-primary transition hover:bg-surface-pearl" to={`/jobs/${job.id}`}>
                    Open
                  </Link>
                </div>
                <p className="mt-3 line-clamp-2 max-w-4xl text-sm leading-6 text-foreground">
                  {job.description || "No description provided."}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <span className="rounded-md bg-surface-pearl px-2.5 py-1 text-xs font-semibold text-muted">{formatJobLocation(job)}</span>
                  <span className="rounded-md bg-surface-pearl px-2.5 py-1 text-xs font-semibold text-muted">{formatJobPay(job)}</span>
                  <StatusBadge tone={jobStatusTone(job.status)}>{humanizeEnum(job.status)}</StatusBadge>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Listing registry</p>
            <p className="mt-1 text-sm text-muted">Owned listings with edit, promotion, status, delete, and restore controls.</p>
          </div>
          <div className="divide-y divide-border">
            {filteredJobs.map((job) => {
              const ownsJob = job.createdByUserId === user?.id;
              const isEditing = editingJobId === job.id;
              return (
                <article className="px-4 py-4 transition hover:bg-surface-pearl" key={job.id}>
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          Posted {formatPostedDate(job.createdAt)}
                        </span>
                        <span aria-hidden="true">•</span>
                        <span>{formatJobOwner(job)}</span>
                        {job.isPromoted ? (
                          <>
                            <span aria-hidden="true">•</span>
                            <span className="font-semibold text-primary">Promoted</span>
                          </>
                        ) : null}
                        {job.deletedAt ? (
                          <>
                            <span aria-hidden="true">•</span>
                            <span className="font-semibold text-danger">Deleted</span>
                          </>
                        ) : null}
                      </div>
                      {isEditing ? (
                        <div className="mt-3 grid gap-3 lg:grid-cols-2">
                          <div className="lg:col-span-2">
                            <Field label="Title">
                              <Input aria-label="Edit job title" onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} value={editForm.title} />
                            </Field>
                          </div>
                          <div className="lg:col-span-2">
                            <Field label="Description">
                              <Input aria-label="Edit job description" onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" value={editForm.description} />
                            </Field>
                          </div>
                          <Field label="City">
                            <Input aria-label="Edit job city" onChange={(event) => setEditForm((current) => ({ ...current, preferredCity: event.target.value }))} placeholder="City" value={editForm.preferredCity} />
                          </Field>
                          <Field label="Country">
                            <Input aria-label="Edit job country" maxLength={2} onChange={(event) => setEditForm((current) => ({ ...current, preferredCountryCode: event.target.value.toUpperCase() }))} placeholder="MK" value={editForm.preferredCountryCode} />
                          </Field>
                          <Field label="Expected pay">
                            <Input aria-label="Edit expected pay" inputMode="decimal" onChange={(event) => setEditForm((current) => ({ ...current, expectedPayAmount: event.target.value }))} placeholder="Amount" value={editForm.expectedPayAmount} />
                          </Field>
                        </div>
                      ) : (
                        <>
                          <Link className="mt-3 block text-lg font-semibold leading-6 text-foreground transition hover:text-primary" to={`/jobs/${job.id}`}>
                            {job.title}
                          </Link>
                          <p className="mt-2 line-clamp-2 max-w-4xl text-sm leading-6 text-foreground">{job.description ?? "No description provided."}</p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-md bg-surface-pearl px-2.5 py-1 text-xs font-semibold text-muted">{formatJobLocation(job)}</span>
                            <span className="rounded-md bg-surface-pearl px-2.5 py-1 text-xs font-semibold text-muted">{formatJobPay(job)}</span>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-col gap-3 xl:w-80">
                      {isMine && ownsJob && !isDeletedView ? (
                        <Select
                          className="h-9 min-w-28"
                          disabled={statusMutation.isPending}
                          onChange={(event) => statusMutation.mutate({ id: job.id, status: event.target.value as "OPEN" | "PAUSED" | "CLOSED" })}
                          value={job.status}
                        >
                          <option value="OPEN">Open</option>
                          <option value="PAUSED">Paused</option>
                          <option value="CLOSED">Closed</option>
                        </Select>
                      ) : (
                        <div><StatusBadge tone={jobStatusTone(job.status)}>{humanizeEnum(job.status)}</StatusBadge></div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        {isEditing ? (
                          <>
                            <Tooltip label="Save listing changes">
                              <Button aria-label={`Save ${job.title}`} className="h-9 min-h-9 px-3" disabled={updateMutation.isPending || editForm.title.trim().length < 3} onClick={() => updateMutation.mutate({ id: job.id, values: editForm })} type="button">
                                <Save className="size-4" aria-hidden="true" />
                                Save
                              </Button>
                            </Tooltip>
                            <Tooltip label="Cancel editing">
                              <Button aria-label={`Cancel editing ${job.title}`} className="h-9 min-h-9 px-3" onClick={() => setEditingJobId(null)} type="button" variant="secondary">
                                <X className="size-4" aria-hidden="true" />
                                Cancel
                              </Button>
                            </Tooltip>
                          </>
                        ) : (
                          <Link className="inline-flex min-h-9 items-center rounded-lg border border-primary bg-card px-3 py-1.5 text-sm text-primary" to={`/jobs/${job.id}`}>
                            Open
                          </Link>
                        )}
                        {!isEditing && isMine && ownsJob && !isDeletedView ? (
                          <Tooltip label="Edit listing">
                            <Button aria-label={`Edit ${job.title}`} className="h-9 min-h-9 px-3" onClick={() => startEdit(job)} type="button" variant="secondary">
                              <Pencil className="size-4" aria-hidden="true" />
                              Edit
                            </Button>
                          </Tooltip>
                        ) : null}
                        {!isEditing && ownsJob && user?.role === "JOB_SEEKER" && !isDeletedView ? (
                          <Tooltip label="Promote this listing">
                            <Button className="h-9 min-h-9 px-3" disabled={promoteMutation.isPending} onClick={() => promoteMutation.mutate(job.id)} type="button" variant="secondary">
                              <Sparkles className="size-4" aria-hidden="true" />
                              Promote
                            </Button>
                          </Tooltip>
                        ) : null}
                        {!isEditing && isMine && ownsJob && !isDeletedView ? (
                          <Tooltip label="Delete listing">
                            <Button aria-label={`Delete ${job.title}`} className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => window.confirm("Delete this job listing? It will be hidden from the public job feed.") && deleteMutation.mutate(job.id)} type="button" variant="danger">
                              <Trash2 className="size-4" aria-hidden="true" />
                              Delete
                            </Button>
                          </Tooltip>
                        ) : null}
                        {!isEditing && isMine && ownsJob && isDeletedView ? (
                          <Tooltip label="Restore listing">
                            <Button aria-label={`Restore ${job.title}`} className="h-9 min-h-9 px-3" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(job.id)} type="button" variant="secondary">
                              <RotateCcw className="size-4" aria-hidden="true" />
                              Restore
                            </Button>
                          </Tooltip>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      <Surface>
        <div className="flex items-start gap-3">
          <div className="grid size-10 place-items-center rounded-lg bg-surface-pearl text-primary">
            <BriefcaseBusiness className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Lane rules</h2>
            <p className="mt-1 text-sm leading-6 text-muted">
              Job seekers see company-created listings. Company users see job-seeker-created listings. The backend blocks self-apply and wrong-lane submissions.
            </p>
          </div>
        </div>
      </Surface>
    </div>
  );
}

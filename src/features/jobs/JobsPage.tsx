import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Filter, Pencil, Plus, RotateCcw, Save, Sparkles, Trash2, X } from "lucide-react";
import { useState } from "react";
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
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { Field, Input, Select } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { formatJobLocation, formatJobOwner, formatJobPay, jobStatusTone } from "./jobFormatters";

type JobsPageProps = {
  scope?: "feed" | "mine";
};

export function JobsPage({ scope = "feed" }: JobsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ description: "", expectedPayAmount: "", preferredCity: "", preferredCountryCode: "", title: "" });
  const isMine = scope === "mine";
  const query = useQuery({
    queryFn: isMine ? listMyJobApplications : () => listJobApplications(),
    queryKey: ["job-applications", scope],
  });
  const jobs = query.data ?? [];
  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "ALL";
  const filteredJobs = jobs.filter((job) => {
    const needle = q.trim().toLowerCase();
    const matchesStatus = status === "ALL" || job.status === status;
    const haystack = `${job.title} ${job.description ?? ""} ${formatJobLocation(job)} ${formatJobOwner(job)}`.toLowerCase();
    return matchesStatus && (!needle || haystack.includes(needle));
  });

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
          user?.role === "JOB_SEEKER" ? (
            <Link className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" to="/jobs/new">
              <Plus className="size-4" aria-hidden="true" />
              Create listing
            </Link>
          ) : null
        }
        eyebrow="Job marketplace"
        subtitle={isMine ? "Manage your job-seeker listings and promotion state." : "Browse lane-aware job marketplace listings returned by the backend."}
        title={isMine ? "My job listings" : "Jobs"}
      />

      <Surface>
        <div className="grid gap-4 md:grid-cols-[1fr_14rem_auto] md:items-end">
          <Field label="Search jobs">
            <Input onChange={(event) => updateFilter("q", event.target.value)} placeholder="Title, company, city" value={q} />
          </Field>
          <Field label="Status">
            <Select onChange={(event) => updateFilter("status", event.target.value)} value={status}>
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="PAUSED">Paused</option>
              <option value="CLOSED">Closed</option>
            </Select>
          </Field>
          <Button onClick={() => setSearchParams(new URLSearchParams())} type="button" variant="secondary">
            <Filter className="size-4" aria-hidden="true" />
            Clear
          </Button>
        </div>
      </Surface>

      {filteredJobs.length === 0 ? (
        <EmptyState
          action={user?.role === "JOB_SEEKER" ? <Link className="text-sm font-semibold text-primary" to="/jobs/new">Create your first listing</Link> : null}
          description={jobs.length === 0 ? "No job listings are available for your lane yet." : "No jobs match the current filters."}
          title={jobs.length === 0 ? "No jobs yet" : "No matching jobs"}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Listing</Th>
              <Th>Owner</Th>
              <Th>Location</Th>
              <Th>Pay</Th>
              <Th>Status</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {filteredJobs.map((job) => {
              const ownsJob = job.createdByUserId === user?.id;
              const isEditing = editingJobId === job.id;
              return (
                <tr key={job.id}>
                  <Td>
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input aria-label="Edit job title" onChange={(event) => setEditForm((current) => ({ ...current, title: event.target.value }))} value={editForm.title} />
                        <Input aria-label="Edit job description" onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" value={editForm.description} />
                      </div>
                    ) : (
                      <>
                        <Link className="font-semibold text-primary" to={`/jobs/${job.id}`}>
                          {job.title}
                        </Link>
                        <p className="mt-1 line-clamp-2 text-xs text-muted">{job.description ?? "No description provided."}</p>
                      </>
                    )}
                    {job.isPromoted ? <p className="mt-1 text-xs font-semibold text-primary">Promoted</p> : null}
                    {job.deletedAt ? <p className="mt-1 text-xs font-semibold text-danger">Deleted</p> : null}
                  </Td>
                  <Td>{formatJobOwner(job)}</Td>
                  <Td>
                    {isEditing ? (
                      <div className="grid gap-2">
                        <Input aria-label="Edit job city" onChange={(event) => setEditForm((current) => ({ ...current, preferredCity: event.target.value }))} placeholder="City" value={editForm.preferredCity} />
                        <Input aria-label="Edit job country" maxLength={2} onChange={(event) => setEditForm((current) => ({ ...current, preferredCountryCode: event.target.value.toUpperCase() }))} placeholder="MK" value={editForm.preferredCountryCode} />
                      </div>
                    ) : formatJobLocation(job)}
                  </Td>
                  <Td>
                    {isEditing ? (
                      <Input aria-label="Edit expected pay" inputMode="decimal" onChange={(event) => setEditForm((current) => ({ ...current, expectedPayAmount: event.target.value }))} placeholder="Amount" value={editForm.expectedPayAmount} />
                    ) : formatJobPay(job)}
                  </Td>
                  <Td>
                    {isMine && ownsJob && !job.deletedAt ? (
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
                      <StatusBadge tone={jobStatusTone(job.status)}>{humanizeEnum(job.status)}</StatusBadge>
                    )}
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {isEditing ? (
                        <>
                          <Button aria-label={`Save ${job.title}`} className="h-9 min-h-9 px-3" disabled={updateMutation.isPending || editForm.title.trim().length < 3} onClick={() => updateMutation.mutate({ id: job.id, values: editForm })} type="button">
                            <Save className="size-4" aria-hidden="true" />
                            Save
                          </Button>
                          <Button aria-label={`Cancel editing ${job.title}`} className="h-9 min-h-9 px-3" onClick={() => setEditingJobId(null)} type="button" variant="secondary">
                            <X className="size-4" aria-hidden="true" />
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Link className="inline-flex min-h-9 items-center rounded-lg border border-primary bg-card px-3 py-1.5 text-sm text-primary" to={`/jobs/${job.id}`}>
                          Open
                        </Link>
                      )}
                      {!isEditing && isMine && ownsJob && !job.deletedAt ? (
                        <Button aria-label={`Edit ${job.title}`} className="h-9 min-h-9 px-3" onClick={() => startEdit(job)} type="button" variant="secondary">
                          <Pencil className="size-4" aria-hidden="true" />
                          Edit
                        </Button>
                      ) : null}
                      {!isEditing && ownsJob && user?.role === "JOB_SEEKER" && !job.deletedAt ? (
                        <Button className="h-9 min-h-9 px-3" disabled={promoteMutation.isPending} onClick={() => promoteMutation.mutate(job.id)} type="button" variant="secondary">
                          <Sparkles className="size-4" aria-hidden="true" />
                          Promote
                        </Button>
                      ) : null}
                      {!isEditing && isMine && ownsJob && !job.deletedAt ? (
                        <Button aria-label={`Delete ${job.title}`} className="h-9 min-h-9 px-3" disabled={deleteMutation.isPending} onClick={() => window.confirm("Delete this job listing? It will be hidden from the public job feed.") && deleteMutation.mutate(job.id)} type="button" variant="danger">
                          <Trash2 className="size-4" aria-hidden="true" />
                          Delete
                        </Button>
                      ) : null}
                      {!isEditing && isMine && ownsJob && job.deletedAt ? (
                        <Button aria-label={`Restore ${job.title}`} className="h-9 min-h-9 px-3" disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(job.id)} type="button" variant="secondary">
                          <RotateCcw className="size-4" aria-hidden="true" />
                          Restore
                        </Button>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
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

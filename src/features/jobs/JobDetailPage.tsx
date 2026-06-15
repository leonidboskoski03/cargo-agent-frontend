import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useParams } from "react-router-dom";
import { uploadDocument } from "@/shared/api/modules/documents";
import {
  applyToJobApplication,
  listJobApplications,
  listJobApplicationSubmissions,
  listMyJobApplications,
  promoteJobApplication,
  promoteJobApplicationSubmission,
} from "@/shared/api/modules/jobApplications";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { FileUploadControl } from "@/shared/components/ui/FileUploadControl";
import { Field, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { fileToBase64 } from "@/shared/lib/files";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { formatJobLocation, formatJobOwner, formatJobPay, formatSubmissionOwner, jobStatusTone } from "./jobFormatters";
import { jobApplySchema, type JobApplyFormInput, type JobApplyFormValues } from "./jobSchemas";

export function JobDetailPage() {
  const { jobApplicationId = "" } = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [applicationFile, setApplicationFile] = useState<File | null>(null);
  const feedQuery = useQuery({ queryFn: () => listJobApplications(), queryKey: ["job-applications", "feed"] });
  const mineQuery = useQuery({ queryFn: () => listMyJobApplications({ deleted: "include" }), queryKey: ["job-applications", "mine", "include-deleted"] });
  const jobs = [...(feedQuery.data ?? []), ...(mineQuery.data ?? [])];
  const job = jobs.find((item) => item.id === jobApplicationId);
  const ownsJob = Boolean(job && job.createdByUserId === user?.id);
  const canListSubmissions = ownsJob;
  const submissionsQuery = useQuery({
    enabled: canListSubmissions,
    queryFn: () => listJobApplicationSubmissions(jobApplicationId),
    queryKey: ["job-applications", jobApplicationId, "submissions"],
  });
  const form = useForm<JobApplyFormInput, unknown, JobApplyFormValues>({
    resolver: zodResolver(jobApplySchema),
    defaultValues: { documentName: "CV", documentUrl: "", message: "" },
  });
  const applyMutation = useAppMutation({
    messages: { success: "Application submitted" },
    mutationFn: async (values: JobApplyFormValues) => {
      if (!applicationFile) return applyToJobApplication(jobApplicationId, { message: values.message });

      const document = await uploadDocument({
        contentBase64: await fileToBase64(applicationFile),
        fileName: applicationFile.name,
        kind: "OTHER",
        metadataJson: { jobApplicationId, purpose: "JOB_APPLICATION_ATTACHMENT" },
        mimeType: applicationFile.type || "application/pdf",
        name: values.documentName ?? "Application document",
      });

      return applyToJobApplication(jobApplicationId, {
        documentName: values.documentName,
        documentUrl: document.url,
        message: values.message,
      });
    },
    onSuccess: () => {
      form.reset();
      setApplicationFile(null);
      void queryClient.invalidateQueries({ queryKey: ["job-applications", jobApplicationId, "submissions"] });
    },
  });
  const promoteListingMutation = useAppMutation({
    messages: { success: "Listing promoted" },
    mutationFn: promoteJobApplication,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["job-applications"] }),
  });
  const promoteSubmissionMutation = useAppMutation({
    messages: { success: "Submission promoted" },
    mutationFn: ({ submissionId }: { submissionId: string }) => promoteJobApplicationSubmission(jobApplicationId, submissionId),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["job-applications", jobApplicationId, "submissions"] }),
  });

  if (feedQuery.isLoading || mineQuery.isLoading) {
    return <LoadingState description="Loading job listing details and lane permissions." title="Loading job" />;
  }

  if (feedQuery.error || mineQuery.error) {
    return <ErrorState description="The job listing could not be loaded." error={feedQuery.error ?? mineQuery.error} title="Unable to load job" />;
  }

  if (!job) {
    return <EmptyState description="The listing is not available in your job marketplace lane, or it no longer exists." title="Job not found" />;
  }

  const canApply = !ownsJob && job.status === "OPEN";

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-primary" to="/jobs">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to jobs
      </Link>
      <PageHeader
        action={
          ownsJob && user?.role === "JOB_SEEKER" ? (
            <Button disabled={promoteListingMutation.isPending} onClick={() => promoteListingMutation.mutate(job.id)} type="button" variant="secondary">
              <Sparkles className="size-4" aria-hidden="true" />
              Promote listing
            </Button>
          ) : null
        }
        eyebrow="Job listing"
        subtitle={job.description ?? "Review this job marketplace listing and the allowed next action."}
        title={job.title}
      />

      <div className="grid gap-5 lg:grid-cols-[0.62fr_0.38fr]">
        <Surface>
          <dl className="grid gap-4 md:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Status</dt>
              <dd className="mt-1"><StatusBadge tone={jobStatusTone(job.status)}>{humanizeEnum(job.status)}</StatusBadge></dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Owner</dt>
              <dd className="mt-1 text-sm">{formatJobOwner(job)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Location</dt>
              <dd className="mt-1 text-sm">{formatJobLocation(job)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Expected pay</dt>
              <dd className="mt-1 text-sm">{formatJobPay(job)}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted">Promotion</dt>
              <dd className="mt-1 text-sm">{job.isPromoted ? `Promoted until ${job.promotedUntil?.slice(0, 10) ?? "active"}` : "Not promoted"}</dd>
            </div>
          </dl>
        </Surface>

        <Surface>
          {canApply ? (
            <form className="space-y-4" onSubmit={form.handleSubmit((values) => applyMutation.mutate(values))}>
              <div>
                <h2 className="text-xl font-semibold">Apply or respond</h2>
                <p className="mt-1 text-sm leading-6 text-muted">The backend applies lane rules and quota or credit billing where needed.</p>
              </div>
              <Field error={form.formState.errors.message} label="Message">
                <Textarea {...form.register("message")} placeholder="Availability, fit, contact context, or next step." />
              </Field>
              <div className="grid gap-4 md:grid-cols-[0.42fr_0.58fr]">
                <Field error={form.formState.errors.documentName} label="Document label">
                  <Select {...form.register("documentName")}>
                    <option value="CV">CV</option>
                    <option value="Resume">Resume</option>
                    <option value="Portfolio">Portfolio</option>
                    <option value="Company profile">Company profile</option>
                    <option value="Other">Other</option>
                  </Select>
                </Field>
                <Field error={form.formState.errors.documentUrl} label="Application document">
                  <FileUploadControl
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    disabled={applyMutation.isPending}
                    error={applyMutation.error}
                    isUploading={applyMutation.isPending}
                    onFileSelect={setApplicationFile}
                    value={applicationFile?.name}
                  />
                </Field>
              </div>
              <Button disabled={applyMutation.isPending} type="submit">
                <Send className="size-4" aria-hidden="true" />
                Submit
              </Button>
            </form>
          ) : (
            <EmptyState
              description={ownsJob ? "This is your listing. Incoming submissions appear below." : "This listing is not open for your lane right now."}
              title={ownsJob ? "Submission management" : "Action unavailable"}
            />
          )}
        </Surface>
      </div>

      {ownsJob ? (
        submissionsQuery.isLoading ? (
          <LoadingState description="Loading submissions for your listing." title="Loading submissions" />
        ) : submissionsQuery.error ? (
          <ErrorState description="Submissions could not be loaded." error={submissionsQuery.error} title="Unable to load submissions" />
        ) : (submissionsQuery.data ?? []).length === 0 ? (
          <EmptyState description="Submissions from interested companies or job seekers will appear here." title="No submissions yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Submitted by</Th>
                <Th>Message</Th>
                <Th>Document</Th>
                <Th>Status</Th>
                <Th>Promotion</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(submissionsQuery.data ?? []).map((submission) => (
                <tr key={submission.id}>
                  <Td>{formatSubmissionOwner(submission)}</Td>
                  <Td>{submission.message ?? "No message"}</Td>
                  <Td>{submission.documentUrl ? <a className="font-semibold text-primary" href={submission.documentUrl} rel="noreferrer" target="_blank">{submission.documentName ?? "Document"}</a> : "No document"}</Td>
                  <Td><StatusBadge tone={jobStatusTone(submission.status)}>{humanizeEnum(submission.status ?? "PENDING")}</StatusBadge></Td>
                  <Td>{submission.isPromoted ? `Promoted until ${submission.promotedUntil?.slice(0, 10) ?? "active"}` : "Not promoted"}</Td>
                  <Td>
                    {submission.submittedByUserId === user?.id && user?.role === "JOB_SEEKER" ? (
                      <Button
                        className="h-9 min-h-9 px-3"
                        disabled={promoteSubmissionMutation.isPending}
                        onClick={() => promoteSubmissionMutation.mutate({ submissionId: submission.id })}
                        type="button"
                        variant="secondary"
                      >
                        <Sparkles className="size-4" aria-hidden="true" />
                        Promote
                      </Button>
                    ) : (
                      <span className="text-sm text-muted">No actions</span>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )
      ) : null}
    </div>
  );
}

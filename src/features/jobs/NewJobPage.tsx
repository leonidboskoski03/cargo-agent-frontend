import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { createJobApplication } from "@/shared/api/modules/jobApplications";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Textarea } from "@/shared/components/ui/Form";
import { ErrorState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { jobApplicationSchema, type JobApplicationFormInput, type JobApplicationFormValues } from "./jobSchemas";

export function NewJobPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const form = useForm<JobApplicationFormInput, unknown, JobApplicationFormValues>({
    resolver: zodResolver(jobApplicationSchema),
    defaultValues: {
      currency: "EUR",
      description: "",
      expectedPayAmount: "",
      preferredCity: "",
      preferredCountryCode: "",
      title: "",
    },
  });
  const createMutation = useAppMutation({
    messages: { success: "Job listing created" },
    mutationFn: createJobApplication,
    onSuccess: (job) => {
      void queryClient.invalidateQueries({ queryKey: ["job-applications"] });
      navigate(`/jobs/${job.id}`);
    },
  });

  if (user?.role !== "JOB_SEEKER") {
    return <ErrorState description="Only job seekers can create independent job marketplace listings." title="Job seeker access required" />;
  }

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-primary" to="/jobs/mine">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to my listings
      </Link>
      <PageHeader
        eyebrow="Job marketplace"
        subtitle="Create an independent listing that companies can discover and respond to."
        title="Create job listing"
      />

      <Surface>
        <form className="grid gap-4 lg:grid-cols-2" onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}>
          <div className="lg:col-span-2">
            <Field error={form.formState.errors.title} label="Title" required>
              <Input {...form.register("title")} placeholder="International truck driver available" />
            </Field>
          </div>
          <Field error={form.formState.errors.preferredCity} label="Preferred city">
            <Input {...form.register("preferredCity")} placeholder="Skopje" />
          </Field>
          <Field error={form.formState.errors.preferredCountryCode} label="Preferred country">
            <Input {...form.register("preferredCountryCode")} maxLength={2} placeholder="MK" />
          </Field>
          <Field error={form.formState.errors.expectedPayAmount} label="Expected pay">
            <Input {...form.register("expectedPayAmount")} inputMode="decimal" placeholder="1200" />
          </Field>
          <Field error={form.formState.errors.currency} label="Currency">
            <Input {...form.register("currency")} maxLength={3} placeholder="EUR" />
          </Field>
          <div className="lg:col-span-2">
            <Field error={form.formState.errors.description} label="Description">
              <Textarea {...form.register("description")} placeholder="Experience, routes, vehicle categories, availability, and contact preferences." />
            </Field>
          </div>
          <div className="lg:col-span-2">
            <Button disabled={createMutation.isPending} type="submit">
              <Plus className="size-4" aria-hidden="true" />
              Create listing
            </Button>
          </div>
        </form>
      </Surface>
    </div>
  );
}

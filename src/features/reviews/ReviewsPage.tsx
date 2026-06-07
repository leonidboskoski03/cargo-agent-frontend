import { RotateCcw, Star, Trash2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listContracts } from "@/shared/api/modules/contracts";
import {
  changeReviewStatus,
  createReview,
  deleteReview,
  listReviews,
  restoreReview,
  type ReviewRecord,
  type ReviewStatus,
} from "@/shared/api/modules/reviews";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageReviews } from "@/features/support/supportPermissions";
import { reviewCreateSchema, reviewFilterSchema } from "./reviewSchemas";

const statuses: ReviewStatus[] = ["DRAFT", "PUBLISHED", "WITHDRAWN"];

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function reviewTone(status: ReviewStatus) {
  if (status === "PUBLISHED") return "success";
  if (status === "WITHDRAWN") return "danger";
  return "neutral";
}

export function ReviewsPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageReviews(user?.role);
  const [statusFilter, setStatusFilter] = useState<ReviewStatus | "">("");
  const [contractFilter, setContractFilter] = useState("");
  const [recentlyDeleted, setRecentlyDeleted] = useState<ReviewRecord | null>(null);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ comment: "", contractId: "", rating: 5, status: "DRAFT" as ReviewStatus });
  const filters = useMemo(() => reviewFilterSchema.parse({ contractId: contractFilter, status: statusFilter || undefined }), [contractFilter, statusFilter]);
  const reviewsQuery = useQuery({ queryFn: () => listReviews(filters), queryKey: ["reviews", filters] });
  const contractsQuery = useQuery({ enabled: canManage, queryFn: () => listContracts({ status: "COMPLETED" }), queryKey: ["contracts", "completed"] });
  const reviews = reviewsQuery.data ?? [];
  const completedContracts = contractsQuery.data ?? [];
  const refresh = () => void queryClient.invalidateQueries({ queryKey: ["reviews"] });
  const createMutation = useAppMutation({ mutationFn: createReview, messages: { success: "Review created." }, onSuccess: () => {
    setForm({ comment: "", contractId: "", rating: 5, status: "DRAFT" });
    refresh();
  } });
  const statusMutation = useAppMutation({ mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) => changeReviewStatus(reviewId, status), messages: { success: "Review status updated." }, onSuccess: refresh });
  const deleteMutation = useAppMutation({ mutationFn: deleteReview, messages: { success: "Review deleted." }, onSuccess: (review) => {
    setRecentlyDeleted(review);
    refresh();
  } });
  const restoreMutation = useAppMutation({ mutationFn: restoreReview, messages: { success: "Review restored." }, onSuccess: () => {
    setRecentlyDeleted(null);
    refresh();
  } });

  const updateForm = (field: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [field]: value }));
  const submitReview = () => {
    const parsed = reviewCreateSchema.safeParse(form);
    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "Check review fields.");
      return;
    }
    setValidationMessage(null);
    createMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        subtitle="Contract-linked review workflow for completed agreements."
        title="Reviews"
      />
      {validationMessage ? <Surface className="border-amber-200 bg-amber-50"><p className="text-sm font-semibold text-amber-800">{validationMessage}</p></Surface> : null}
      <section className="grid gap-5 xl:grid-cols-[0.36fr_0.64fr]">
        <Surface>
          <div className="flex items-center gap-3">
            <Star className="size-5 text-primary" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-semibold tracking-normal">{canManage ? "Create review" : "Read-only reviews"}</h2>
              <p className="mt-1 text-sm text-muted">Only completed contracts are offered as review targets.</p>
            </div>
          </div>
          {canManage ? (
            <div className="mt-5 space-y-3">
              <Field label="Completed contract" required>
                <Select onChange={(event) => updateForm("contractId", event.target.value)} value={form.contractId}>
                  <option value="">Select contract</option>
                  {completedContracts.map((contract) => (
                    <option key={contract.id} value={contract.id}>Contract {contract.id.slice(0, 8)}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Rating" required><Input max={5} min={1} onChange={(event) => updateForm("rating", Number(event.target.value))} type="number" value={form.rating} /></Field>
              <Field label="Status">
                <Select onChange={(event) => updateForm("status", event.target.value as ReviewStatus)} value={form.status}>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </Select>
              </Field>
              <Field label="Comment"><Textarea onChange={(event) => updateForm("comment", event.target.value)} value={form.comment} /></Field>
              <Button disabled={createMutation.isPending || completedContracts.length === 0} onClick={submitReview} type="button">Create review</Button>
              {completedContracts.length === 0 ? <p className="text-sm text-muted">No completed contracts are available for review creation.</p> : null}
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-border bg-surface-pearl px-4 py-3 text-sm text-muted">
              Drivers can view reviews allowed by backend scope but cannot create or mutate reviews.
            </p>
          )}
        </Surface>
        <Surface>
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Review records</h2>
              <p className="mt-1 text-sm text-muted">{reviews.length} contract-linked reviews.</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Status">
                <Select onChange={(event) => setStatusFilter(event.target.value as ReviewStatus | "")} value={statusFilter}>
                  <option value="">All</option>
                  {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                </Select>
              </Field>
              <Field label="Contract ID"><Input onChange={(event) => setContractFilter(event.target.value)} value={contractFilter} /></Field>
              {recentlyDeleted ? (
                <Button disabled={restoreMutation.isPending} onClick={() => restoreMutation.mutate(recentlyDeleted.id)} type="button" variant="secondary">
                  <RotateCcw className="size-4" /> Restore last
                </Button>
              ) : null}
            </div>
          </div>
          {reviewsQuery.isLoading ? (
            <LoadingState title="Loading reviews" />
          ) : reviewsQuery.isError ? (
            <ErrorState error={reviewsQuery.error} title="Reviews unavailable" />
          ) : reviews.length === 0 ? (
            <EmptyState description="Reviews for contracts in your company context will appear here." title="No reviews" />
          ) : (
            <Table>
              <thead><tr><Th>Review</Th><Th>Status</Th><Th>Contract</Th><Th>Created</Th>{canManage ? <Th>Actions</Th> : null}</tr></thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id}>
                    <Td>
                      <Link className="font-semibold text-primary" to={`/reviews/${review.id}`}>{review.rating}/5 stars</Link>
                      <p className="mt-1 text-sm text-muted">{review.comment ?? "No comment"}</p>
                    </Td>
                    <Td><StatusBadge tone={reviewTone(review.status)}>{review.status}</StatusBadge></Td>
                    <Td>Contract {review.contractId.slice(0, 8)}</Td>
                    <Td>{formatDate(review.createdAt)}</Td>
                    {canManage ? (
                      <Td>
                        <div className="flex flex-wrap gap-2">
                          <Select
                            aria-label={`Change status for review ${review.id}`}
                            className="w-36"
                            onChange={(event) => statusMutation.mutate({ reviewId: review.id, status: event.target.value as ReviewStatus })}
                            value={review.status}
                          >
                            {statuses.map((status) => <option key={status} value={status}>{status}</option>)}
                          </Select>
                          <Button disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(review.id)} type="button" variant="danger">
                            <Trash2 className="size-4" /> Delete
                          </Button>
                        </div>
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Surface>
      </section>
    </div>
  );
}

import { ArrowLeft, Star } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { getReview } from "@/shared/api/modules/reviews";
import { ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatusBadge } from "@/shared/components/ui/DataTable";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function ReviewDetailPage() {
  const { reviewId } = useParams();
  const reviewQuery = useQuery({
    enabled: Boolean(reviewId),
    queryFn: () => getReview(reviewId ?? ""),
    queryKey: ["reviews", reviewId],
  });

  if (!reviewId) return <ErrorState description="Missing review id in route." title="Review unavailable" />;
  if (reviewQuery.isLoading) return <LoadingState title="Loading review" />;
  if (reviewQuery.isError) return <ErrorState error={reviewQuery.error} title="Review unavailable" />;

  const review = reviewQuery.data;
  if (!review) return <ErrorState description="The review was not returned by the backend." title="Review unavailable" />;

  return (
    <div className="space-y-6">
      <PageHeader
        action={<Link className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-primary" to="/reviews"><ArrowLeft className="size-4" /> Back</Link>}
        eyebrow="Review detail"
        subtitle={`Contract ${review.contractId}`}
        title={`${review.rating}/5 stars`}
      />
      <Surface>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge>{review.status}</StatusBadge>
          <StatusBadge>{review.contract.status}</StatusBadge>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground"><Star className="size-4 text-primary" /> {review.rating}</span>
        </div>
        <p className="mt-5 text-sm leading-6 text-muted">{review.comment ?? "No comment was provided."}</p>
        <dl className="mt-6 grid gap-4 text-sm md:grid-cols-2">
          <div><dt className="text-muted">Reviewer company</dt><dd className="font-semibold">{review.reviewerCompanyId}</dd></div>
          <div><dt className="text-muted">Target company</dt><dd className="font-semibold">{review.targetCompanyId}</dd></div>
          <div><dt className="text-muted">Created</dt><dd className="font-semibold">{formatDate(review.createdAt)}</dd></div>
          <div><dt className="text-muted">Updated</dt><dd className="font-semibold">{formatDate(review.updatedAt)}</dd></div>
        </dl>
      </Surface>
    </div>
  );
}

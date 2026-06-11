import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, RefreshCw, WalletCards } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getJobSeekerCheckoutSession } from "@/shared/api/modules/jobSeekerBilling";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";

export function JobWalletCheckoutPage() {
  const { sessionId = "" } = useParams();
  const user = useAuthStore((state) => state.user);
  const query = useQuery({
    enabled: Boolean(sessionId) && user?.role === "JOB_SEEKER",
    queryFn: () => getJobSeekerCheckoutSession(sessionId),
    queryKey: ["job-seeker-billing", "checkout", sessionId],
    refetchInterval: (queryState) => {
      const status = queryState.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 3000;
    },
  });

  if (user?.role !== "JOB_SEEKER") return <ErrorState description="Job wallet checkout status is available to job seekers only." title="Job checkout" />;
  if (query.isLoading) return <LoadingState description="Checking the latest Stripe sandbox checkout state." title="Loading checkout" />;
  if (query.error) return <ErrorState description="The checkout session could not be loaded." error={query.error} title="Unable to load checkout" />;

  const session = query.data;
  const isPending = session?.status !== "COMPLETED" && session?.status !== "FAILED";

  return (
    <div className="space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm text-primary" to="/job-wallet">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to wallet
      </Link>
      <PageHeader eyebrow="Job seeker billing" subtitle="Checkout status updates after Stripe confirms payment and the webhook credits your wallet." title="Credit checkout" />
      {isPending ? (
        <Surface className="border-amber-100 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Waiting for Stripe webhook processing</p>
          <p className="mt-1 text-sm leading-6 text-amber-800">
            Keep the Stripe listener running. This page refreshes every few seconds until credits are added or the checkout fails.
          </p>
        </Surface>
      ) : null}
      <Surface>
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <WalletCards className="size-6 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-2xl font-semibold">{session?.amountCredits ?? 0} credits</h2>
            <p className="mt-2 text-sm text-muted">Session ID: {session?.checkoutSessionId ?? sessionId}</p>
            {session?.stripeCheckoutSessionId ? <p className="mt-1 text-sm text-muted">Stripe: {session.stripeCheckoutSessionId}</p> : null}
          </div>
          <StatusBadge tone={session?.status === "COMPLETED" ? "success" : session?.status === "FAILED" ? "danger" : "warning"}>
            {humanizeEnum(session?.status ?? "PENDING")}
          </StatusBadge>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <Button onClick={() => void query.refetch()} type="button" variant="secondary">
            <RefreshCw className="size-4" aria-hidden="true" />
            Refresh status
          </Button>
          <Link className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground" to="/job-wallet">
            View wallet
          </Link>
        </div>
      </Surface>
    </div>
  );
}

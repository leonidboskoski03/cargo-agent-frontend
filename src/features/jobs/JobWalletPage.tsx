import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, WalletCards } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createJobSeekerCheckoutSession,
  getJobSeekerUsage,
  getJobSeekerWallet,
  listJobSeekerCreditPacks,
  listJobSeekerTransactions,
} from "@/shared/api/modules/jobSeekerBilling";
import { getBillingReadiness, type BillingReadiness } from "@/shared/api/modules/billingReadiness";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { BillingProviderBanner } from "@/features/billing/BillingProviderBanner";

function idempotencyKey(packCode: string) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return `job-wallet-${packCode}-${suffix}`;
}

function jobWalletCheckoutSetupMessage(readiness?: BillingReadiness) {
  if (!readiness) return "Checking Stripe job wallet setup before purchases are enabled.";
  if (!readiness.stripeSecretConfigured) return "Stripe test secret key is missing. Configure it before starting job wallet checkout.";
  if (!readiness.jobSeekerCreditPricesConfigured) return "Job seeker credit pack Stripe prices are missing. Add price IDs to the seeded credit packs before checkout.";
  return null;
}

function jobWalletCheckoutErrorDescription() {
  return "Job wallet checkout is not ready yet. Check Stripe test keys and job seeker credit pack price IDs, then try again.";
}

export function JobWalletPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const readinessQuery = useQuery({ enabled: user?.role === "JOB_SEEKER", queryFn: getBillingReadiness, queryKey: ["billing", "readiness"], staleTime: 1000 * 30 });
  const walletQuery = useQuery({ enabled: user?.role === "JOB_SEEKER", queryFn: getJobSeekerWallet, queryKey: ["job-seeker-billing", "wallet"] });
  const usageQuery = useQuery({ enabled: user?.role === "JOB_SEEKER", queryFn: getJobSeekerUsage, queryKey: ["job-seeker-billing", "usage"] });
  const packsQuery = useQuery({ queryFn: () => listJobSeekerCreditPacks({ activeOnly: true }), queryKey: ["job-seeker-billing", "packs"] });
  const transactionsQuery = useQuery({
    enabled: user?.role === "JOB_SEEKER",
    queryFn: () => listJobSeekerTransactions({ page: 1, pageSize: 20 }),
    queryKey: ["job-seeker-billing", "transactions"],
  });
  const checkoutMutation = useAppMutation({
    messages: { success: "Checkout session created" },
    mutationFn: createJobSeekerCheckoutSession,
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ["job-seeker-billing"] });
      if (session.checkoutUrl) window.location.assign(session.checkoutUrl);
      else navigate(`/job-wallet/checkout/${session.checkoutSessionId}`);
    },
  });

  if (user?.role !== "JOB_SEEKER") {
    return <ErrorState description="The job wallet is available to job seekers only." title="Job seeker wallet" />;
  }

  if (walletQuery.isLoading || usageQuery.isLoading || packsQuery.isLoading || transactionsQuery.isLoading) {
    return <LoadingState description="Loading wallet balance, usage quota, credit packs, and transaction history." title="Loading job wallet" />;
  }

  const error = walletQuery.error ?? usageQuery.error ?? packsQuery.error ?? transactionsQuery.error;
  if (error) {
    return <ErrorState description="The job seeker wallet could not be loaded." error={error} title="Unable to load wallet" />;
  }

  const wallet = walletQuery.data;
  const usage = usageQuery.data;
  const packs = packsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const checkoutSetupMessage = jobWalletCheckoutSetupMessage(readinessQuery.data);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Job seeker billing"
        subtitle="Included quota is used first, then credits are spent for applications, listings, vehicle posts, and promotions."
        title="Job wallet"
      />
      {searchParams.get("checkout") === "canceled" ? (
        <Surface className="border-amber-100 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Stripe checkout was canceled.</p>
          <p className="mt-1 text-sm text-amber-800">No job credits were purchased. You can choose a pack and start checkout again.</p>
        </Surface>
      ) : null}
      <BillingProviderBanner context="job-wallet" readiness={readinessQuery.data} />
      {readinessQuery.error ? (
        <ErrorState description="Billing readiness could not be loaded. Checkout errors will still include trace IDs." error={readinessQuery.error} title="Job wallet readiness unavailable" />
      ) : null}
      {checkoutMutation.error ? (
        <ErrorState description={jobWalletCheckoutErrorDescription()} error={checkoutMutation.error} title="Unable to start checkout" />
      ) : null}

      <Surface>
        <div>
          <h2 className="text-xl font-semibold">Wallet overview</h2>
          <p className="mt-1 text-sm text-muted">Included quota is consumed first, then wallet credits cover extra actions.</p>
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-surface-pearl p-4">
            <WalletCards className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-xl font-semibold">{wallet?.balanceCredits ?? 0} credits</h3>
            <p className="mt-1 text-sm text-muted">Available wallet balance</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-pearl p-4">
            <CreditCard className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-xl font-semibold">{usage?.quotas.applications.remaining ?? 0} free applies</h3>
            <p className="mt-1 text-sm text-muted">{usage?.quotas.applications.used ?? 0} of {usage?.quotas.applications.limit ?? 0} used this month</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-pearl p-4">
            <CreditCard className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-xl font-semibold">{usage?.quotas.activeListings.remaining ?? 0} free listings</h3>
            <p className="mt-1 text-sm text-muted">{usage?.quotas.activeListings.creditCostPerAction ?? 2} credits after quota</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-pearl p-4">
            <CreditCard className="size-5 text-primary" aria-hidden="true" />
            <h3 className="mt-3 text-xl font-semibold">{usage?.quotas.vehicleListings.remaining ?? 0} vehicle posts</h3>
            <p className="mt-1 text-sm text-muted">{usage?.quotas.vehicleListings.creditCostPerAction ?? 3} credits after quota</p>
          </div>
        </div>
      </Surface>

      <Surface>
        <h2 className="text-xl font-semibold">Credit packs</h2>
        {checkoutSetupMessage ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{checkoutSetupMessage}</p>
        ) : null}
        {packs.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No active credit packs are available.</p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packs.map((pack) => (
              <div className="rounded-lg border border-border bg-surface-pearl p-4" key={pack.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{pack.name}</h3>
                    <p className="mt-1 text-sm text-muted">{pack.description ?? `${pack.credits} job marketplace credits`}</p>
                  </div>
                  <StatusBadge tone={pack.isActive ? "success" : "warning"}>{pack.isActive ? "Active" : "Inactive"}</StatusBadge>
                </div>
                <p className="mt-4 text-lg font-semibold">{pack.priceAmount} {pack.currency}</p>
                <Button
                  className="mt-4 w-full"
                  disabled={checkoutMutation.isPending || !pack.isActive || Boolean(checkoutSetupMessage)}
                  onClick={() => checkoutMutation.mutate({ creditPackCode: pack.code, idempotencyKey: idempotencyKey(pack.code) })}
                  type="button"
                >
                  Buy credits
                </Button>
              </div>
            ))}
          </div>
        )}
      </Surface>

      <Surface>
        <h2 className="text-xl font-semibold">Transaction history</h2>
        <p className="mt-1 text-sm text-muted">Wallet purchases, spends, refunds, and adjustments appear in this ledger.</p>
        <div className="mt-4">
          {transactions.length === 0 ? (
            <EmptyState description="Credit purchases, spends, refunds, and adjustments will appear here." title="No transactions yet" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Type</Th>
                  <Th>Amount</Th>
                  <Th>Balance after</Th>
                  <Th>Reason</Th>
                  <Th>Date</Th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <Td>{humanizeEnum(transaction.type)}</Td>
                    <Td>{transaction.amountCredits}</Td>
                    <Td>{transaction.balanceAfter}</Td>
                    <Td>{humanizeEnum(transaction.reasonCode)}</Td>
                    <Td>{transaction.createdAt.slice(0, 10)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Surface>
    </div>
  );
}

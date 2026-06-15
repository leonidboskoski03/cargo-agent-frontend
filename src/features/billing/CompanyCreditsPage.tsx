import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, WalletCards } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createCompanyCreditCheckoutSession,
  getCompanyCreditUsage,
  getCompanyCreditWallet,
  listCompanyCreditPacks,
  listCompanyCreditTransactions,
} from "@/shared/api/modules/companyCredits";
import { getBillingReadiness, type BillingReadiness } from "@/shared/api/modules/billingReadiness";
import { Button } from "@/shared/components/ui/Button";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { humanizeEnum } from "@/shared/lib/formatters";
import { useAuthStore } from "@/features/auth/authStore";
import { BillingProviderBanner } from "./BillingProviderBanner";
import { canManageBilling } from "./billingPermissions";

function idempotencyKey(packCode: string) {
  const suffix = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`;
  return `company-credits-${packCode}-${suffix}`;
}

function companyCreditCheckoutSetupMessage(readiness?: BillingReadiness) {
  if (!readiness) return "Checking Stripe credit checkout setup before purchases are enabled.";
  if (!readiness.stripeSecretConfigured) return "Stripe test secret key is missing. Configure it before starting company credit checkout.";
  if (!readiness.companyCreditPricesConfigured) return "Company credit pack Stripe prices are missing. Add price IDs to the seeded credit packs before checkout.";
  return null;
}

function companyCreditCheckoutErrorDescription() {
  return "Company credit checkout is not ready yet. Check Stripe test keys and company credit pack price IDs, then try again.";
}

export function CompanyCreditsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageBilling(user?.role);
  const walletQuery = useQuery({ enabled: Boolean(user?.companyId), queryFn: getCompanyCreditWallet, queryKey: ["company-credits", "wallet"] });
  const readinessQuery = useQuery({ enabled: Boolean(user?.companyId), queryFn: getBillingReadiness, queryKey: ["billing", "readiness"], staleTime: 1000 * 30 });
  const usageQuery = useQuery({ enabled: Boolean(user?.companyId), queryFn: getCompanyCreditUsage, queryKey: ["company-credits", "usage"] });
  const packsQuery = useQuery({ enabled: Boolean(user?.companyId), queryFn: () => listCompanyCreditPacks({ activeOnly: true }), queryKey: ["company-credits", "packs"] });
  const transactionsQuery = useQuery({
    enabled: Boolean(user?.companyId),
    queryFn: () => listCompanyCreditTransactions({ page: 1, pageSize: 20 }),
    queryKey: ["company-credits", "transactions"],
  });
  const checkoutMutation = useAppMutation({
    messages: { success: "Company credit checkout created" },
    mutationFn: createCompanyCreditCheckoutSession,
    onSuccess: (session) => {
      void queryClient.invalidateQueries({ queryKey: ["company-credits"] });
      if (session.checkoutUrl) window.location.assign(session.checkoutUrl);
      else navigate(`/company-credits/checkout/${session.checkoutSessionId}`);
    },
  });

  if (!user?.companyId) {
    return <ErrorState description="Company credits are available to company workspaces only." title="Company credits" />;
  }

  if (walletQuery.isLoading || usageQuery.isLoading || packsQuery.isLoading || transactionsQuery.isLoading) {
    return <LoadingState description="Loading company wallet, usage quota, credit packs, and transaction history." title="Loading company credits" />;
  }

  const error = walletQuery.error ?? usageQuery.error ?? packsQuery.error ?? transactionsQuery.error;
  if (error) return <ErrorState description="Company credits could not be loaded." error={error} title="Unable to load company credits" />;

  const wallet = walletQuery.data;
  const usage = usageQuery.data;
  const packs = packsQuery.data ?? [];
  const transactions = transactionsQuery.data ?? [];
  const checkoutSetupMessage = companyCreditCheckoutSetupMessage(readinessQuery.data);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Company marketplace credits" subtitle="Use included plan quotas first, then company credits for marketplace publishing." title="Company credits" />
      {searchParams.get("checkout") === "canceled" ? (
        <Surface className="border-amber-100 bg-amber-50">
          <p className="text-sm font-semibold text-amber-900">Stripe checkout was canceled.</p>
          <p className="mt-1 text-sm text-amber-800">No credits were purchased. You can choose a pack and start checkout again.</p>
        </Surface>
      ) : null}
      <BillingProviderBanner context="company-credits" readiness={readinessQuery.data} />
      {readinessQuery.error ? (
        <ErrorState description="Billing readiness could not be loaded. Checkout errors will still include trace IDs." error={readinessQuery.error} title="Company credit readiness unavailable" />
      ) : null}
      {checkoutMutation.error ? (
        <ErrorState description={companyCreditCheckoutErrorDescription()} error={checkoutMutation.error} title="Unable to start checkout" />
      ) : null}
      <section className="grid gap-4 lg:grid-cols-4">
        <Surface><WalletCards className="size-5 text-primary" /><h2 className="mt-3 text-xl font-semibold">{wallet?.balanceCredits ?? 0} credits</h2><p className="mt-1 text-sm text-muted">Company wallet balance</p></Surface>
        <Surface><CreditCard className="size-5 text-primary" /><h2 className="mt-3 text-xl font-semibold">{usage?.quotas.jobPosts.remaining ?? 0} job posts</h2><p className="mt-1 text-sm text-muted">{usage?.quotas.jobPosts.creditCostPerAction ?? 2} credits after quota</p></Surface>
        <Surface><CreditCard className="size-5 text-primary" /><h2 className="mt-3 text-xl font-semibold">{usage?.quotas.vehicleListings.remaining ?? 0} vehicle listings</h2><p className="mt-1 text-sm text-muted">{usage?.quotas.vehicleListings.creditCostPerAction ?? 3} credits after quota</p></Surface>
        <Surface><CreditCard className="size-5 text-primary" /><h2 className="mt-3 text-xl font-semibold">{usage?.quotas.transportPosts.creditCostPerAction ?? 2} credits</h2><p className="mt-1 text-sm text-muted">Transport posts after active-post plan quota</p></Surface>
      </section>

      <Surface>
        <h2 className="text-xl font-semibold">Credit packs</h2>
        {checkoutSetupMessage ? (
          <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{checkoutSetupMessage}</p>
        ) : null}
        {packs.length === 0 ? <p className="mt-3 text-sm text-muted">No active company credit packs are available.</p> : (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {packs.map((pack) => (
              <div className="rounded-lg border border-border bg-surface-pearl p-4" key={pack.id}>
                <div className="flex items-start justify-between gap-3">
                  <div><h3 className="font-semibold">{pack.name}</h3><p className="mt-1 text-sm text-muted">{pack.credits} company marketplace credits</p></div>
                  <StatusBadge tone={pack.isActive ? "success" : "warning"}>{pack.isActive ? "Active" : "Inactive"}</StatusBadge>
                </div>
                <p className="mt-4 text-lg font-semibold">{pack.priceAmount} {pack.currency}</p>
                <Button className="mt-4 w-full" disabled={!canManage || checkoutMutation.isPending || !pack.isActive || Boolean(checkoutSetupMessage)} onClick={() => checkoutMutation.mutate({ creditPackCode: pack.code, idempotencyKey: idempotencyKey(pack.code) })} type="button">
                  {canManage ? "Buy credits" : "Admin only"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </Surface>

      {transactions.length === 0 ? (
        <EmptyState description="Company credit purchases, spends, refunds, and adjustments will appear here." title="No transactions yet" />
      ) : (
        <Table>
          <thead><tr><Th>Type</Th><Th>Amount</Th><Th>Balance after</Th><Th>Reason</Th><Th>Date</Th></tr></thead>
          <tbody>
            {transactions.map((transaction) => (
              <tr key={transaction.id}>
                <Td>{humanizeEnum(transaction.type)}</Td>
                <Td>{transaction.amountCredits}</Td>
                <Td>{transaction.balanceAfter}</Td>
                <Td>{humanizeEnum(transaction.reasonCode ?? "UNKNOWN")}</Td>
                <Td>{transaction.createdAt.slice(0, 10)}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}

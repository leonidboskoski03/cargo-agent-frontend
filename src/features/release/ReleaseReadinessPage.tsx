import { CheckCircle2, ExternalLink, ShieldCheck, TriangleAlert } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getDeliveryStatus } from "@/shared/api/modules/delivery";
import { listBillingEvents } from "@/shared/api/modules/billingEvents";
import { getBillingReadiness } from "@/shared/api/modules/billingReadiness";
import { listPlans } from "@/shared/api/modules/plans";
import { getMySubscription } from "@/shared/api/modules/subscriptions";
import { StatusBadge } from "@/shared/components/ui/DataTable";
import { ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { useAuthStore } from "@/features/auth/authStore";
import { canManageCompany } from "@/features/team/teamPermissions";

function tone(ready: boolean) {
  return ready ? "success" : "warning";
}

function ReadinessRow({ description, ready, title }: { description: string; ready: boolean; title: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface-pearl p-3">
      {ready ? <CheckCircle2 className="mt-0.5 size-4 text-emerald-600" aria-hidden="true" /> : <TriangleAlert className="mt-0.5 size-4 text-amber-600" aria-hidden="true" />}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{title}</p>
          <StatusBadge tone={tone(ready)}>{ready ? "Ready" : "Needs evidence"}</StatusBadge>
        </div>
        <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
      </div>
    </div>
  );
}

const uatChecks = [
  {
    id: "UAT-AUTH-001",
    title: "Login and session handling",
    description: "Reviewer signs in, confirms protected routes require auth, and records logout behavior.",
  },
  {
    id: "UAT-MKT-001",
    title: "Marketplace route to post",
    description: "Create a location, create a route, publish a post, and attach screenshots to the dated evidence folder.",
  },
  {
    id: "UAT-MKT-002",
    title: "Bid to contract handoff",
    description: "Submit a bid from another company, accept or reject it, create a contract, and capture trace-ID errors if blocked.",
  },
  {
    id: "UAT-SUP-004",
    title: "Completed-contract review",
    description: "Complete a contract and create/update a review only when backend eligibility allows it.",
  },
  {
    id: "UAT-WEB-003",
    title: "Stripe webhook replay",
    description: "Attach real Stripe test event IDs and duplicate replay proof from the webhook evidence script.",
  },
  {
    id: "UAT-OPS-001",
    title: "CI and release signoff",
    description: "Attach CI required-check proof, merge-block proof, and Product/QA/Ops approval records.",
  },
];

export function ReleaseReadinessPage() {
  const user = useAuthStore((state) => state.user);
  const canView = canManageCompany(user?.role);
  const deliveryQuery = useQuery({ enabled: canView, queryFn: getDeliveryStatus, queryKey: ["delivery", "status"], staleTime: 1000 * 30 });
  const billingReadinessQuery = useQuery({ enabled: canView, queryFn: getBillingReadiness, queryKey: ["billing", "readiness", "release-readiness"], staleTime: 1000 * 30 });
  const plansQuery = useQuery({ enabled: canView, queryFn: () => listPlans(), queryKey: ["plans", "release-readiness"], staleTime: 1000 * 30 });
  const subscriptionQuery = useQuery({ enabled: canView, queryFn: () => getMySubscription(), queryKey: ["subscriptions", "me", "release-readiness"], staleTime: 1000 * 30 });
  const eventsQuery = useQuery({ enabled: canView, queryFn: () => listBillingEvents({ page: 1, pageSize: 5 }), queryKey: ["billing-events", "release-readiness"], staleTime: 1000 * 30 });

  if (!canView) {
    return <ErrorState description="Release readiness diagnostics are available to company admins only." title="Admin-only release readiness" />;
  }

  if (deliveryQuery.isLoading || billingReadinessQuery.isLoading || plansQuery.isLoading || subscriptionQuery.isLoading || eventsQuery.isLoading) {
    return <LoadingState description="Checking delivery, storage, and billing-facing readiness signals." title="Loading release readiness" />;
  }

  if (deliveryQuery.error) {
    return <ErrorState description="Provider readiness could not be loaded." error={deliveryQuery.error} title="Unable to load readiness" />;
  }

  const delivery = deliveryQuery.data;
  const billingReadiness = billingReadinessQuery.data;
  const billingReachable = !plansQuery.error && !subscriptionQuery.error && !eventsQuery.error;
  const stripeConfigured = Boolean(
    billingReadiness?.stripeSecretConfigured &&
      billingReadiness.stripeWebhookSecretConfigured &&
      billingReadiness.proPriceConfigured &&
      billingReadiness.companyCreditPricesConfigured &&
      billingReadiness.jobSeekerCreditPricesConfigured,
  );
  const emailReady = Boolean(delivery?.email.configured && delivery.invites.configured && delivery.otp.configured);
  const storageReady = Boolean(delivery?.storage.configured);

  return (
    <div className="space-y-6">
      <PageHeader
        action={<Link className="inline-flex items-center gap-2 text-sm font-semibold text-primary" to="/billing">Open billing <ExternalLink className="size-4" /></Link>}
        eyebrow="Release gate"
        subtitle="Live provider signals and the evidence still required before the release docs can move from NO-GO to GO."
        title="Release readiness"
      />

      <section className="grid gap-4 xl:grid-cols-3">
        <Surface>
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold">Delivery</h2>
          <p className="mt-1 text-sm text-muted">{delivery?.email.provider ?? "unknown"} / {delivery?.email.mode ?? "unknown"}</p>
          <div className="mt-4">
            <StatusBadge tone={tone(emailReady)}>{emailReady ? "Provider configured" : "Provider evidence pending"}</StatusBadge>
          </div>
        </Surface>
        <Surface>
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold">Storage</h2>
          <p className="mt-1 text-sm text-muted">{delivery?.storage.provider ?? "unknown"} provider</p>
          <div className="mt-4">
            <StatusBadge tone={tone(storageReady)}>{storageReady ? "Configured" : "Missing config"}</StatusBadge>
          </div>
        </Surface>
        <Surface>
          <ShieldCheck className="size-5 text-primary" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-semibold">Billing API</h2>
          <p className="mt-1 text-sm text-muted">Stripe keys, prices, queues, and billing probes</p>
          <div className="mt-4">
            <StatusBadge tone={tone(billingReachable && stripeConfigured)}>{billingReachable && stripeConfigured ? "Sandbox ready" : "Evidence pending"}</StatusBadge>
          </div>
        </Surface>
      </section>

      <Surface>
        <h2 className="text-xl font-semibold">Gate checklist</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <ReadinessRow
            description={emailReady ? "OTP and invite delivery report provider-backed configuration." : `Missing: ${delivery?.email.missing.join(", ") || "provider validation artifact"}.`}
            ready={emailReady}
            title="RB-006 delivery mode"
          />
          <ReadinessRow
            description={storageReady ? "Upload storage is configured for the selected provider." : `Missing: ${delivery?.storage.missing.join(", ") || "storage provider validation"}.`}
            ready={storageReady}
            title="Media upload storage"
          />
          <ReadinessRow
            description={
              stripeConfigured
                ? "Stripe test secret, webhook secret, PRO price, credit-pack prices, and queue mode are configured. Real event IDs are still required for release proof."
                : "Missing one or more Stripe readiness booleans: secret key, webhook secret, PRO price, company credit prices, or job seeker credit prices."
            }
            ready={stripeConfigured}
            title="RB-003 Stripe sandbox"
          />
          <ReadinessRow
            description={billingReachable ? "Plans, subscription, and billing event reads are available." : "Billing probes failed; open Billing for trace-ID details."}
            ready={billingReachable}
            title="Billing API probes"
          />
          <ReadinessRow
            description={billingReadiness?.bullmqEnabled ? "Worker mode is queue-enabled; capture worker startup logs for evidence." : "Queue mode is disabled; staging proof should explain why webhooks process synchronously."}
            ready={Boolean(billingReadiness?.bullmqEnabled)}
            title="BullMQ worker mode"
          />
          <ReadinessRow
            description="Contract adoption is covered by npm run test:evidence:contracts and the G-005 artifact."
            ready
            title="RB-005 contract adoption"
          />
          <ReadinessRow
            description="Manual UAT, cross-functional signoff, CI branch protection, and retained Stripe event IDs must be attached by humans."
            ready={false}
            title="External release evidence"
          />
        </div>
      </Surface>

      <Surface>
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Manual UAT checklist</h2>
            <p className="mt-1 text-sm text-muted">These checks are intentionally pending until reviewers attach screenshots, CI links, provider proof, and signoff.</p>
          </div>
          <StatusBadge tone="warning">Evidence required</StatusBadge>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {uatChecks.map((check) => (
            <div className="rounded-lg border border-border bg-surface-pearl p-3" key={check.id}>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase text-primary">{check.id}</span>
                <StatusBadge tone="warning">Needs evidence</StatusBadge>
              </div>
              <h3 className="mt-2 text-sm font-semibold">{check.title}</h3>
              <p className="mt-1 text-xs leading-5 text-muted">{check.description}</p>
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}

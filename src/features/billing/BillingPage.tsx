import { CreditCard, ExternalLink, RefreshCcw, RotateCcw, ShieldAlert } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listBillingEvents } from "@/shared/api/modules/billingEvents";
import { listPlans, type PlanRecord } from "@/shared/api/modules/plans";
import {
  cancelSubscriptionAtPeriodEnd,
  createCheckoutSession,
  createPortalSession,
  getMySubscription,
  revertSubscriptionCancel,
} from "@/shared/api/modules/subscriptions";
import { Button } from "@/shared/components/ui/Button";
import { Field, Input, Textarea } from "@/shared/components/ui/Form";
import { EmptyState, ErrorState, LoadingState, PageHeader, Surface } from "@/shared/components/ui/Page";
import { StatusBadge, Table, Td, Th } from "@/shared/components/ui/DataTable";
import { useAppMutation } from "@/shared/hooks/useAppMutation";
import { toApiClientError } from "@/shared/api/apiClient";
import { useAuthStore } from "@/features/auth/authStore";
import { billingEventsFilterSchema, cancelReasonSchema, checkoutSchema } from "./billingSchemas";
import { canManageBilling } from "./billingPermissions";

function formatMoney(plan: PlanRecord) {
  const amount = Number(plan.priceAmount);
  if (!Number.isFinite(amount)) return `${plan.priceAmount} ${plan.currency ?? ""}`.trim();
  return new Intl.NumberFormat("en", { currency: plan.currency ?? "EUR", style: "currency" }).format(amount);
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
}

function statusTone(status?: string | null) {
  if (status === "ACTIVE" || status === "TRIALING" || status === "READY" || status === "succeeded") return "success";
  if (status === "PAST_DUE" || status === "INCOMPLETE" || status === "UNPAID") return "warning";
  if (status === "CANCELED" || status === "failed") return "danger";
  return "neutral";
}

export function BillingPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const canManage = canManageBilling(user?.role);
  const [selectedPlanCode, setSelectedPlanCode] = useState("PRO");
  const [idempotencyKey, setIdempotencyKey] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [eventPage, setEventPage] = useState(1);
  const [eventPageSize, setEventPageSize] = useState(20);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const plansQuery = useQuery({ queryFn: () => listPlans(), queryKey: ["plans"] });
  const subscriptionQuery = useQuery({ queryFn: () => getMySubscription(), queryKey: ["subscriptions", "me"] });
  const eventFilters = useMemo(
    () => billingEventsFilterSchema.parse({ page: eventPage, pageSize: eventPageSize }),
    [eventPage, eventPageSize],
  );
  const eventsQuery = useQuery({
    queryFn: () => listBillingEvents(eventFilters),
    queryKey: ["billing-events", eventFilters],
  });

  const refreshBilling = () => {
    void queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
    void queryClient.invalidateQueries({ queryKey: ["billing-events"] });
  };

  const checkoutMutation = useAppMutation({
    mutationFn: createCheckoutSession,
    messages: { success: "Checkout session created." },
    onSuccess: (session) => {
      refreshBilling();
      if (session.checkoutUrl) window.location.assign(session.checkoutUrl);
    },
  });
  const portalMutation = useAppMutation({
    mutationFn: createPortalSession,
    messages: { success: "Billing portal session created." },
    onSuccess: (session) => {
      if (session.portalUrl) window.location.assign(session.portalUrl);
    },
  });
  const cancelMutation = useAppMutation({
    mutationFn: cancelSubscriptionAtPeriodEnd,
    messages: { success: "Cancellation scheduled." },
    onSuccess: refreshBilling,
  });
  const revertMutation = useAppMutation({
    mutationFn: revertSubscriptionCancel,
    messages: { success: "Cancellation reverted." },
    onSuccess: refreshBilling,
  });

  const mutationError = checkoutMutation.error ?? portalMutation.error ?? cancelMutation.error ?? revertMutation.error;
  const providerError = mutationError ? toApiClientError(mutationError) : null;
  const plans = plansQuery.data ?? [];
  const subscription = subscriptionQuery.data;
  const billingEvents = eventsQuery.data ?? [];
  const paidPlans = plans.filter((plan) => plan.code !== "FREE");

  const startCheckout = () => {
    const parsed = checkoutSchema.safeParse({ idempotencyKey, planCode: selectedPlanCode });
    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "Check the checkout fields.");
      return;
    }
    setValidationMessage(null);
    checkoutMutation.mutate(parsed.data);
  };

  const scheduleCancel = () => {
    const parsed = cancelReasonSchema.safeParse({ reason: cancelReason });
    if (!parsed.success) {
      setValidationMessage(parsed.error.issues[0]?.message ?? "Check the cancellation reason.");
      return;
    }
    setValidationMessage(null);
    cancelMutation.mutate(parsed.data);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        action={<Link className="text-sm font-semibold text-primary" to="/dashboard">Back to dashboard</Link>}
        eyebrow="Stage 5"
        subtitle="Plan catalog, subscription state, Stripe sandbox actions, and billing events from the company backend."
        title="Billing"
      />

      {providerError ? (
        <ErrorState
          description="Stripe may be unconfigured locally. Treat provider errors here as expected sandbox feedback until live keys are present."
          error={providerError}
          title="Billing provider not ready"
        />
      ) : null}
      {validationMessage ? (
        <Surface className="border-amber-200 bg-amber-50">
          <p className="text-sm font-semibold text-amber-800">{validationMessage}</p>
        </Surface>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[0.38fr_0.62fr]">
        <Surface>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Current subscription</h2>
              <p className="mt-1 text-sm text-muted">Company-level billing authority remains admin-only.</p>
            </div>
            <CreditCard className="size-5 text-primary" aria-hidden="true" />
          </div>
          {subscriptionQuery.isLoading ? (
            <div className="mt-5"><LoadingState title="Loading subscription" /></div>
          ) : subscriptionQuery.isError ? (
            <div className="mt-5"><ErrorState error={subscriptionQuery.error} title="Subscription unavailable" /></div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={statusTone(subscription?.status)}>{subscription?.status ?? "NO SUBSCRIPTION"}</StatusBadge>
                <StatusBadge>{subscription?.planCode ?? "FREE"}</StatusBadge>
                {subscription?.cancelAtPeriodEnd ? <StatusBadge tone="warning">CANCELS AT PERIOD END</StatusBadge> : null}
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div><dt className="text-muted">Starts</dt><dd className="font-semibold">{formatDate(subscription?.startsAt)}</dd></div>
                <div><dt className="text-muted">Ends</dt><dd className="font-semibold">{formatDate(subscription?.endsAt)}</dd></div>
              </dl>
              {canManage ? (
                <div className="space-y-3 border-t border-border pt-4">
                  <Field label="Cancel reason">
                    <Textarea
                      onChange={(event) => setCancelReason(event.target.value)}
                      placeholder="Optional internal note"
                      value={cancelReason}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={cancelMutation.isPending} onClick={scheduleCancel} type="button" variant="secondary">
                      <ShieldAlert className="size-4" /> Cancel at period end
                    </Button>
                    <Button disabled={revertMutation.isPending} onClick={() => revertMutation.mutate()} type="button" variant="ghost">
                      <RotateCcw className="size-4" /> Revert cancel
                    </Button>
                    <Button disabled={portalMutation.isPending} onClick={() => portalMutation.mutate()} type="button" variant="ghost">
                      <ExternalLink className="size-4" /> Portal
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="rounded-xl border border-border bg-surface-pearl px-4 py-3 text-sm text-muted">
                  Driver billing view is read-only. Ask a company admin for subscription changes.
                </p>
              )}
            </div>
          )}
        </Surface>

        <Surface>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-normal">Plans</h2>
              <p className="mt-1 text-sm text-muted">Sandbox checkout is available for paid plans when Stripe is configured.</p>
            </div>
            <Button onClick={refreshBilling} type="button" variant="ghost">
              <RefreshCcw className="size-4" /> Refresh
            </Button>
          </div>
          {plansQuery.isLoading ? (
            <LoadingState title="Loading plans" />
          ) : plansQuery.isError ? (
            <ErrorState error={plansQuery.error} title="Plans unavailable" />
          ) : plans.length === 0 ? (
            <EmptyState description="Plan records from /plans will appear here." title="No plans returned" />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {plans.map((plan) => (
                <label
                  className="block rounded-xl border border-border bg-surface-pearl p-4 transition has-[:checked]:border-primary has-[:checked]:bg-card"
                  key={plan.code}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        {canManage && plan.code !== "FREE" ? (
                          <input
                            checked={selectedPlanCode === plan.code}
                            className="size-4"
                            onChange={() => setSelectedPlanCode(plan.code)}
                            type="radio"
                          />
                        ) : null}
                        <h3 className="text-lg font-semibold">{plan.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-muted">{plan.billingInterval ?? "No billing interval"}</p>
                    </div>
                    <p className="text-lg font-semibold">{formatMoney(plan)}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <StatusBadge tone={plan.features.promotedPosts ? "success" : "neutral"}>Promoted posts</StatusBadge>
                    <StatusBadge tone={plan.features.analytics ? "success" : "neutral"}>Analytics</StatusBadge>
                    <StatusBadge tone={plan.features.routeAlerts ? "success" : "neutral"}>Route alerts</StatusBadge>
                  </div>
                </label>
              ))}
            </div>
          )}
          {canManage && paidPlans.length > 0 ? (
            <div className="mt-5 grid gap-3 border-t border-border pt-4 md:grid-cols-[1fr_auto]">
              <Field description="Optional. Leave blank for a generated backend session." label="Idempotency key">
                <Input
                  onChange={(event) => setIdempotencyKey(event.target.value)}
                  placeholder="checkout key"
                  value={idempotencyKey}
                />
              </Field>
              <Button className="self-end" disabled={checkoutMutation.isPending} onClick={startCheckout} type="button">
                <ExternalLink className="size-4" /> Start checkout
              </Button>
            </div>
          ) : null}
        </Surface>
      </section>

      <Surface>
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-normal">Billing events</h2>
            <p className="mt-1 text-sm text-muted">Newest provider and subscription events, paged by the backend.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Page">
              <Input min={1} onChange={(event) => setEventPage(Number(event.target.value))} type="number" value={eventPage} />
            </Field>
            <Field label="Page size">
              <Input min={1} max={100} onChange={(event) => setEventPageSize(Number(event.target.value))} type="number" value={eventPageSize} />
            </Field>
          </div>
        </div>
        {eventsQuery.isLoading ? (
          <LoadingState title="Loading billing events" />
        ) : eventsQuery.isError ? (
          <ErrorState error={eventsQuery.error} title="Billing events unavailable" />
        ) : billingEvents.length === 0 ? (
          <EmptyState description="No billing events were returned for this company and page." title="No events" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Event</Th>
                <Th>Status</Th>
                <Th>Amount</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {billingEvents.map((event) => (
                <tr key={event.id}>
                  <Td className="font-semibold">{event.eventType}</Td>
                  <Td><StatusBadge tone={statusTone(event.status)}>{event.status ?? "UNKNOWN"}</StatusBadge></Td>
                  <Td>{event.amount ? `${event.amount} ${event.currency ?? ""}`.trim() : "No amount"}</Td>
                  <Td>{formatDate(event.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Surface>
    </div>
  );
}

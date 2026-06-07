import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { PlanCode } from "@/shared/api/modules/plans";

export type SubscriptionSummary = {
  cancelAtPeriodEnd: boolean;
  companyId: string;
  endsAt: string | null;
  planCode: PlanCode;
  startsAt: string | null;
  status: "FREE" | "TRIALING" | "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE" | "UNPAID";
};

export type CheckoutSession = {
  checkoutSessionId: string;
  checkoutUrl: string | null;
  planCode: PlanCode;
  provider: "stripe";
  status: "READY";
};

export type PortalSession = {
  portalSessionId: string;
  portalUrl: string | null;
  provider: "stripe";
  status: "READY";
};

export type CheckoutSessionInput = {
  idempotencyKey?: string;
  planCode: PlanCode;
};

export type CancelSubscriptionInput = {
  reason?: string;
};

export function getMySubscription() {
  return unwrapData<SubscriptionSummary | null>(apiClient.get("/subscriptions/me"));
}

export function createCheckoutSession(input: CheckoutSessionInput) {
  return unwrapData<CheckoutSession>(apiClient.post("/subscriptions/checkout-session", input));
}

export function cancelSubscriptionAtPeriodEnd(input: CancelSubscriptionInput = {}) {
  return unwrapData<SubscriptionSummary>(apiClient.post("/subscriptions/cancel-at-period-end", input));
}

export function revertSubscriptionCancel() {
  return unwrapData<SubscriptionSummary>(apiClient.post("/subscriptions/cancel-revert", {}));
}

export function createPortalSession() {
  return unwrapData<PortalSession>(apiClient.post("/subscriptions/portal-session", {}));
}

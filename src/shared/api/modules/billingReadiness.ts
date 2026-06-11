import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type BillingReadiness = {
  bullmqEnabled: boolean;
  companyCreditPricesConfigured: boolean;
  jobSeekerCreditPricesConfigured: boolean;
  proPriceConfigured: boolean;
  stripeSecretConfigured: boolean;
  stripeWebhookSecretConfigured: boolean;
};

export function getBillingReadiness() {
  return unwrapData<BillingReadiness>(apiClient.get("/billing/readiness"));
}

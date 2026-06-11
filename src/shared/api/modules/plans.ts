import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type PlanCode = "FREE" | "PRO";

export type PlanRecord = {
  billingInterval: "MONTHLY" | "YEARLY" | null;
  code: PlanCode;
  currency: string | null;
  features?: {
    analytics: boolean;
    promotedPosts: boolean;
    routeAlerts: boolean;
  };
  name: string;
  priceAmount: string;
};

export function listPlans(params?: { activeOnly?: boolean }) {
  return unwrapData<PlanRecord[]>(apiClient.get("/plans", { params }));
}

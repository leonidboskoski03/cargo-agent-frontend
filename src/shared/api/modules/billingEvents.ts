import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type BillingEvent = {
  amount: string | null;
  createdAt: string;
  currency: string | null;
  eventType: string;
  id: string;
  status: string | null;
};

export type BillingEventsQuery = {
  page?: number;
  pageSize?: number;
};

export function listBillingEvents(params?: BillingEventsQuery) {
  return unwrapData<BillingEvent[]>(apiClient.get("/billing/events", { params }));
}

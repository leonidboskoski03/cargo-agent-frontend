import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type CompanyCreditWallet = {
  balanceCredits: number;
  companyId: string;
  updatedAt: string;
};

export type CompanyCreditUsage = {
  companyId: string;
  periodStart: string;
  quotas: {
    jobPosts: {
      creditCostPerAction: number;
      limit: number;
      remaining: number;
      used: number;
    };
    transportPosts: {
      creditCostPerAction: number;
    };
    vehicleListings: {
      creditCostPerAction: number;
      limit: number;
      remaining: number;
      used: number;
    };
  };
  wallet: {
    balanceCredits: number;
  };
};

export type CompanyCreditPack = {
  code: string;
  credits: number;
  currency: string;
  id: string;
  isActive: boolean;
  name: string;
  priceAmount: string;
};

export type CompanyCreditTransaction = {
  amountCredits: number;
  balanceAfter: number;
  companyId: string;
  createdAt: string;
  id: string;
  reasonCode?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: string;
};

export type CompanyCreditCheckoutSession = {
  amountCredits: number;
  checkoutSessionId: string;
  checkoutUrl?: string | null;
  currency: string;
  reused?: boolean;
  status: string;
  stripeCheckoutSessionId?: string | null;
};

export function getCompanyCreditWallet() {
  return unwrapData<CompanyCreditWallet>(apiClient.get("/company-credits/wallet"));
}

export function getCompanyCreditUsage() {
  return unwrapData<CompanyCreditUsage>(apiClient.get("/company-credits/usage"));
}

export function listCompanyCreditPacks(params?: { activeOnly?: boolean }) {
  return unwrapData<CompanyCreditPack[]>(apiClient.get("/company-credits/packs", { params }));
}

export function listCompanyCreditTransactions(params?: { page?: number; pageSize?: number }) {
  return unwrapData<CompanyCreditTransaction[]>(apiClient.get("/company-credits/transactions", { params }));
}

export function createCompanyCreditCheckoutSession(input: { creditPackCode: string; idempotencyKey?: string }) {
  return unwrapData<CompanyCreditCheckoutSession>(apiClient.post("/company-credits/checkout-sessions", input));
}

export function getCompanyCreditCheckoutSession(sessionId: string) {
  return unwrapData<CompanyCreditCheckoutSession>(apiClient.get(`/company-credits/checkout-sessions/${sessionId}`));
}

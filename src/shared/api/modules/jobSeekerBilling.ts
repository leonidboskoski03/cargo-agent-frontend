import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type JobSeekerWallet = {
  balanceCredits: number;
  updatedAt: string;
  userId: string;
};

export type JobSeekerUsage = {
  periodStart: string;
  quotas: {
    activeListings: {
      creditCostPerAction: number;
      limit: number;
      remaining: number;
      used: number;
    };
    applications: {
      creditCostPerAction: number;
      limit: number;
      remaining: number;
      used: number;
    };
    vehicleListings: {
      creditCostPerAction: number;
      limit: number;
      remaining: number;
      used: number;
    };
  };
  userId: string;
  wallet: {
    balanceCredits: number;
  };
};

export type JobSeekerCreditPack = {
  code: string;
  credits: number;
  currency: string;
  description?: string | null;
  id: string;
  isActive: boolean;
  name: string;
  priceAmount: string;
};

export type JobSeekerTransaction = {
  amountCredits: number;
  balanceAfter: number;
  createdAt: string;
  id: string;
  reasonCode?: string | null;
  referenceId?: string | null;
  referenceType?: string | null;
  type: string;
  userId: string;
};

export type JobSeekerCheckoutSession = {
  amountCredits: number;
  checkoutSessionId: string;
  checkoutUrl?: string | null;
  currency: string;
  reused?: boolean;
  status: string;
  stripeCheckoutSessionId?: string | null;
};

export type CreateJobSeekerCheckoutSessionInput = {
  creditPackCode: string;
  idempotencyKey?: string;
};

export type AdminAdjustJobSeekerCreditsInput = {
  amountCredits: number;
  reasonCode: string;
  targetUserId: string;
};

export function getJobSeekerWallet() {
  return unwrapData<JobSeekerWallet>(apiClient.get("/job-seeker-billing/wallet"));
}

export function getJobSeekerUsage() {
  return unwrapData<JobSeekerUsage>(apiClient.get("/job-seeker-billing/usage"));
}

export function listJobSeekerCreditPacks(params?: { activeOnly?: boolean }) {
  return unwrapData<JobSeekerCreditPack[]>(apiClient.get("/job-seeker-billing/packs", { params }));
}

export function listJobSeekerTransactions(params?: { page?: number; pageSize?: number; type?: string }) {
  return unwrapData<JobSeekerTransaction[]>(apiClient.get("/job-seeker-billing/transactions", { params }));
}

export function createJobSeekerCheckoutSession(input: CreateJobSeekerCheckoutSessionInput) {
  return unwrapData<JobSeekerCheckoutSession>(apiClient.post("/job-seeker-billing/checkout-sessions", input));
}

export function getJobSeekerCheckoutSession(sessionId: string) {
  return unwrapData<JobSeekerCheckoutSession>(apiClient.get(`/job-seeker-billing/checkout-sessions/${sessionId}`));
}

export function adminAdjustJobSeekerCredits(input: AdminAdjustJobSeekerCreditsInput) {
  return unwrapData<JobSeekerTransaction>(apiClient.post("/job-seeker-billing/admin/adjustments", input));
}

import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";
export type BidScope = "received" | "sent" | "all";
export type BidActivityType =
  | "CREATED"
  | "UPDATED"
  | "ACCEPTED"
  | "REJECTED"
  | "WITHDRAWN"
  | "DELETED"
  | "RESTORED"
  | "BOOSTED"
  | "CONTRACT_CREATED";

type CompanySummary = {
  city?: string | null;
  countryCode?: string | null;
  id: string;
  isVerified?: boolean;
  name: string;
};

type RouteSummary = {
  destinationLocation: {
    city: string;
    countryCode: string;
    id: string;
  };
  distanceKm?: number | null;
  estimatedDurationMinutes?: number | null;
  id: string;
  originLocation: {
    city: string;
    countryCode: string;
    id: string;
  };
};

export type BidRecord = {
  billing?: {
    creditCost: number;
    mode: "CREDITS";
    walletBalanceCredits: number;
  };
  boostCredits?: number;
  boostedUntil?: string | null;
  carrierCompanyId: string;
  createdAt: string;
  createdByUserId: string;
  currency: string;
  deletedAt: string | null;
  estimatedDeliveryAt?: string | null;
  estimatedPickupAt?: string | null;
  id: string;
  message?: string | null;
  offeredPriceAmount?: string | null;
  post: {
    cargoDescription?: string | null;
    company?: CompanySummary;
    companyId: string;
    currency: string;
    deletedAt: string | null;
    id: string;
    priceAmount?: string | null;
    priceType: string;
    route?: RouteSummary;
    routeId: string;
    status: string;
    title?: string | null;
  };
  postId: string;
  carrierCompany?: CompanySummary;
  contract?: {
    id: string;
    status: string;
  } | null;
  status: BidStatus;
  updatedAt: string;
};

export type BidActivityRecord = {
  actorCompanyId?: string | null;
  actorUserId?: string | null;
  bidId: string;
  createdAt: string;
  id: string;
  message?: string | null;
  metadataJson?: Record<string, unknown> | null;
  type: BidActivityType;
};

export type BidReplyRecord = {
  authorCompanyId?: string | null;
  authorUserId: string;
  bidId: string;
  createdAt: string;
  deletedAt?: string | null;
  id: string;
  message: string;
  updatedAt: string;
};

export type CreateBidInput = {
  currency: string;
  estimatedDeliveryAt?: string;
  estimatedPickupAt?: string;
  message?: string;
  offeredPriceAmount?: string;
  postId: string;
};

export type BidListParams = {
  deleted?: "active" | "only" | "include";
  postId?: string;
  scope?: BidScope;
  status?: BidStatus;
};

export function listBids(params?: BidListParams) {
  return unwrapData<BidRecord[]>(apiClient.get("/bids", { params }));
}

export function listBidActivities(bidId: string) {
  return unwrapData<BidActivityRecord[]>(apiClient.get(`/bids/${bidId}/activities`));
}

export function listBidReplies(bidId: string) {
  return unwrapData<BidReplyRecord[]>(apiClient.get(`/bids/${bidId}/replies`));
}

export function createBidReply(bidId: string, input: { message: string }) {
  return unwrapData<BidReplyRecord>(apiClient.post(`/bids/${bidId}/replies`, input));
}

export function createBid(input: CreateBidInput) {
  return unwrapData<BidRecord>(apiClient.post("/bids", input));
}

export function updateBid(bidId: string, input: Partial<Omit<CreateBidInput, "postId">>) {
  return unwrapData<BidRecord>(apiClient.patch(`/bids/${bidId}`, input));
}

export function changeBidStatus(bidId: string, status: BidStatus) {
  return unwrapData<BidRecord>(apiClient.patch(`/bids/${bidId}/status`, { status }));
}

export function boostBid(bidId: string, creditAmount: number) {
  return unwrapData<BidRecord>(apiClient.post(`/bids/${bidId}/boost`, { creditAmount }));
}

export function deleteBid(bidId: string) {
  return unwrapData<BidRecord>(apiClient.delete(`/bids/${bidId}`));
}

export function restoreBid(bidId: string) {
  return unwrapData<BidRecord>(apiClient.post(`/bids/${bidId}/restore`, {}));
}

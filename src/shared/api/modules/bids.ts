import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "WITHDRAWN";

export type BidRecord = {
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
    companyId: string;
    currency: string;
    deletedAt: string | null;
    id: string;
    priceType: string;
    routeId: string;
    status: string;
  };
  postId: string;
  status: BidStatus;
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

export function listBids(params?: { postId?: string; status?: BidStatus }) {
  return unwrapData<BidRecord[]>(apiClient.get("/bids", { params }));
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

export function deleteBid(bidId: string) {
  return unwrapData<BidRecord>(apiClient.delete(`/bids/${bidId}`));
}

export function restoreBid(bidId: string) {
  return unwrapData<BidRecord>(apiClient.post(`/bids/${bidId}/restore`, {}));
}

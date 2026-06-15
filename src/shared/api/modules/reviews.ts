import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { ContractStatus } from "@/shared/api/modules/contracts";

export type ReviewStatus = "DRAFT" | "PUBLISHED" | "WITHDRAWN";

export type ReviewRecord = {
  comment: string | null;
  contract: {
    carrierCompanyId: string;
    deletedAt?: string | null;
    id: string;
    shipperCompanyId: string;
    status: ContractStatus;
  };
  contractId: string;
  createdAt: string;
  deletedAt: string | null;
  id: string;
  rating: number;
  reviewerCompanyId: string;
  reviewerUserId: string;
  status: ReviewStatus;
  targetCompanyId: string;
  updatedAt: string;
};

export type ReviewsQuery = {
  contractId?: string;
  deleted?: "active" | "only" | "include";
  status?: ReviewStatus;
};

export type CreateReviewInput = {
  comment?: string;
  contractId: string;
  rating: number;
  status?: ReviewStatus;
};

export type UpdateReviewInput = {
  comment?: string | null;
  rating?: number;
};

export function listReviews(params?: ReviewsQuery) {
  return unwrapData<ReviewRecord[]>(apiClient.get("/reviews", { params }));
}

export function getReview(reviewId: string) {
  return unwrapData<ReviewRecord>(apiClient.get(`/reviews/${reviewId}`));
}

export function createReview(input: CreateReviewInput) {
  return unwrapData<ReviewRecord>(apiClient.post("/reviews", input));
}

export function updateReview(reviewId: string, input: UpdateReviewInput) {
  return unwrapData<ReviewRecord>(apiClient.patch(`/reviews/${reviewId}`, input));
}

export function changeReviewStatus(reviewId: string, status: ReviewStatus) {
  return unwrapData<ReviewRecord>(apiClient.patch(`/reviews/${reviewId}/status`, { status }));
}

export function deleteReview(reviewId: string) {
  return unwrapData<ReviewRecord>(apiClient.delete(`/reviews/${reviewId}`));
}

export function restoreReview(reviewId: string) {
  return unwrapData<ReviewRecord>(apiClient.post(`/reviews/${reviewId}/restore`, {}));
}

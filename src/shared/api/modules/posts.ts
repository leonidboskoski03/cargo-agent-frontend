import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type PostStatus = "DRAFT" | "OPEN" | "ASSIGNED" | "ARCHIVED" | "CANCELLED" | "EXPIRED";
export type PostPriceType = "FIXED" | "NEGOTIABLE" | "REQUEST_QUOTE";
export type PostScope = "marketplace" | "mine";
export type VehicleBodyType = "TILT" | "BOX" | "FLATBED" | "REEFER" | "TANKER";

export type MarketplaceBillingMetadata = {
  creditCost: number;
  mode: "INCLUDED_QUOTA" | "CREDITS";
  quotaLimit?: number | null;
  quotaRemaining?: number;
  quotaUsed?: number;
  walletBalanceCredits: number;
};

export type PostRecord = {
  billing?: MarketplaceBillingMetadata;
  cargoDescription?: string | null;
  cargoType?: string | null;
  companyId: string;
  company?: {
    city?: string | null;
    countryCode?: string | null;
    id: string;
    isVerified?: boolean;
    name: string;
  };
  createdAt: string;
  createdByUserId: string;
  currency: string;
  deletedAt: string | null;
  deliveryDeadlineAt?: string | null;
  description?: string | null;
  expiresAt?: string | null;
  hazmat: boolean;
  id: string;
  isPromoted: boolean;
  palletCount?: number | null;
  pickupEarliestAt?: string | null;
  pickupLatestAt?: string | null;
  priceAmount?: string | null;
  priceType: PostPriceType;
  promotedUntil?: string | null;
  requiredBodyType?: VehicleBodyType | null;
  routeId: string;
  route?: {
    destinationLocation: {
      city: string;
      countryCode: string;
      region?: string | null;
    };
    distanceKm?: number | null;
    estimatedDurationMinutes?: number | null;
    id: string;
    originLocation: {
      city: string;
      countryCode: string;
      region?: string | null;
    };
  };
  status: PostStatus;
  temperatureControlRequired: boolean;
  temperatureMaxC?: number | null;
  temperatureMinC?: number | null;
  title?: string | null;
  updatedAt: string;
  volumeM3?: string | null;
  weightKg?: number | null;
};

export type CreatePostInput = {
  cargoDescription?: string;
  cargoType?: string;
  currency: string;
  description?: string;
  priceAmount?: string;
  priceType: PostPriceType;
  routeId: string;
  status?: Extract<PostStatus, "DRAFT" | "OPEN">;
  title?: string;
  weightKg?: number;
};

export type PostListParams = {
  deleted?: "active" | "only" | "include";
  scope?: PostScope;
  status?: PostStatus;
};

export function listPosts(params?: PostListParams) {
  return unwrapData<PostRecord[]>(apiClient.get("/posts", { params }));
}

export function getPost(postId: string) {
  return unwrapData<PostRecord>(apiClient.get(`/posts/${postId}`));
}

export function createPost(input: CreatePostInput) {
  return unwrapData<PostRecord>(apiClient.post("/posts", input));
}

export function updatePost(postId: string, input: Partial<CreatePostInput>) {
  return unwrapData<PostRecord>(apiClient.patch(`/posts/${postId}`, input));
}

export function changePostStatus(postId: string, status: PostStatus) {
  return unwrapData<PostRecord>(apiClient.patch(`/posts/${postId}/status`, { status }));
}

export function boostPost(postId: string) {
  return unwrapData<PostRecord>(apiClient.post(`/posts/${postId}/boost`, {}));
}

export function deletePost(postId: string) {
  return unwrapData<PostRecord>(apiClient.delete(`/posts/${postId}`));
}

export function restorePost(postId: string) {
  return unwrapData<PostRecord>(apiClient.post(`/posts/${postId}/restore`, {}));
}

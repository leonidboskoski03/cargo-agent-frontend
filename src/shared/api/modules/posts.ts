import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type PostStatus = "OPEN" | "ASSIGNED" | "CANCELLED" | "EXPIRED";
export type PostPriceType = "FIXED" | "NEGOTIABLE" | "REQUEST_QUOTE";
export type VehicleBodyType = "TILT" | "BOX" | "FLATBED" | "REEFER" | "TANKER";

export type PostRecord = {
  cargoDescription?: string | null;
  cargoType?: string | null;
  companyId: string;
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
  requiredBodyType?: VehicleBodyType | null;
  routeId: string;
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
  title?: string;
  weightKg?: number;
};

export function listPosts(params?: { status?: PostStatus }) {
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

export function deletePost(postId: string) {
  return unwrapData<PostRecord>(apiClient.delete(`/posts/${postId}`));
}

export function restorePost(postId: string) {
  return unwrapData<PostRecord>(apiClient.post(`/posts/${postId}/restore`, {}));
}

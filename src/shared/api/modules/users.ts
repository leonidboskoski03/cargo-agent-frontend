import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { AuthUser } from "@/shared/types/auth";

export type UserProfile = AuthUser & {
  availability?: string | null;
  city?: string | null;
  countryCode?: string | null;
  deletedAt?: string | null;
  emailVerifiedAt?: string | null;
  headline?: string | null;
  isActive: boolean;
  phone?: string | null;
  preferredRoutes?: string[];
  updatedAt?: string;
  yearsExperience?: number | null;
};

export type ProfileCompletion = {
  completedItems: string[];
  missingItems: string[];
  nextBestAction: string | null;
  percent: number;
};

export type UserSelfUpdateInput = Partial<{
  firstName: string;
  isActive: boolean;
  lastName: string;
  phone: string | null;
}>;

export type UserMembershipInput = {
  companyId: string | null;
  role: AuthUser["role"];
};

export function getMe() {
  return unwrapData<UserProfile>(apiClient.get("/users/me"));
}

export function listUsers(params?: { includeInactive?: boolean }) {
  return unwrapData<UserProfile[]>(apiClient.get("/users", { params }));
}

export function getUser(userId: string) {
  return unwrapData<UserProfile>(apiClient.get(`/users/${userId}`));
}

export function getMyProfileCompletion() {
  return unwrapData<ProfileCompletion>(apiClient.get("/users/me/profile-completion"));
}

export function updateMyUser(input: UserSelfUpdateInput) {
  return unwrapData<UserProfile>(apiClient.patch("/users/me", input));
}

export function updateUserMembership(userId: string, input: UserMembershipInput) {
  return unwrapData<UserProfile>(apiClient.patch(`/users/${userId}/membership`, input));
}

export function deleteUser(userId: string) {
  return unwrapData<UserProfile>(apiClient.delete(`/users/${userId}`));
}

export function restoreUser(userId: string) {
  return unwrapData<UserProfile>(apiClient.post(`/users/${userId}/restore`, {}));
}

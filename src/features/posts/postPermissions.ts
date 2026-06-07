import type { AuthUser } from "@/shared/types/auth";
import type { BidStatus } from "@/shared/api/modules/bids";
import type { PostStatus } from "@/shared/api/modules/posts";

type UserRole = AuthUser["role"] | undefined;

export function canManageCompanyPosts(role: UserRole) {
  return role === "COMPANY_ADMIN";
}

export function canEditCompanyPost(input: { ownsPost: boolean; role: UserRole; status: PostStatus }) {
  return canManageCompanyPosts(input.role) && input.ownsPost && input.status === "OPEN";
}

export function canDecideBid(input: { ownsPost: boolean; role: UserRole; status: BidStatus }) {
  return canManageCompanyPosts(input.role) && input.ownsPost && input.status === "PENDING";
}

export function canManageOwnPendingBid(input: { ownsBid: boolean; status: BidStatus }) {
  return input.ownsBid && input.status === "PENDING";
}

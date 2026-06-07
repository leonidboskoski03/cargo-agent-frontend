import type { AuthUser } from "@/shared/types/auth";
import type { ContractStatus } from "@/shared/api/modules/contracts";
import type { BidStatus } from "@/shared/api/modules/bids";
import type { PostStatus } from "@/shared/api/modules/posts";

type UserRole = AuthUser["role"] | undefined;

const transitions: Record<ContractStatus, ContractStatus[]> = {
  CANCELLED: [],
  COMPLETED: [],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "DISPUTED"],
  DISPUTED: [],
  IN_PROGRESS: ["COMPLETED", "CANCELLED", "DISPUTED"],
};

export function canCreateContract(input: {
  bidStatus?: BidStatus;
  hasOfferedPrice: boolean;
  ownsPost: boolean;
  postStatus?: PostStatus;
  role: UserRole;
}) {
  return (
    input.role === "COMPANY_ADMIN" &&
    input.ownsPost &&
    input.postStatus === "ASSIGNED" &&
    input.bidStatus === "ACCEPTED" &&
    input.hasOfferedPrice
  );
}

export function contractStatusTargets(status: ContractStatus) {
  return transitions[status] ?? [];
}

export function canChangeContractStatus(input: { isInvolved: boolean; role: UserRole; status: ContractStatus }) {
  return input.role === "COMPANY_ADMIN" && input.isInvolved && contractStatusTargets(input.status).length > 0;
}

export function canDeleteContract(input: { isShipper: boolean; role: UserRole }) {
  return input.role === "COMPANY_ADMIN" && input.isShipper;
}

export function canRestoreContract(input: { isShipper: boolean; role: UserRole }) {
  return canDeleteContract(input);
}

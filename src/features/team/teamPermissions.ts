import type { UserRole } from "@/shared/types/auth";

export function canManageCompany(role?: UserRole) {
  return role === "COMPANY_ADMIN";
}

export function canManageTeam(role?: UserRole) {
  return role === "COMPANY_ADMIN";
}

export function canChangeMembership(input: { currentUserId?: string; role?: UserRole; targetUserId: string }) {
  return canManageTeam(input.role) && input.currentUserId !== input.targetUserId;
}

export function canDeleteTeamUser(input: { currentUserId?: string; role?: UserRole; targetUserId: string }) {
  return canManageTeam(input.role) && input.currentUserId !== input.targetUserId;
}

export function canCreateInvite(role?: UserRole) {
  return canManageTeam(role);
}

import type { UserRole } from "@/shared/types/auth";

export function canManageDocuments(role?: UserRole | null) {
  return role === "COMPANY_ADMIN";
}

export function canViewAuditLogs(role?: UserRole | null) {
  return role === "COMPANY_ADMIN";
}

export function canManageReviews(role?: UserRole | null) {
  return role === "COMPANY_ADMIN";
}

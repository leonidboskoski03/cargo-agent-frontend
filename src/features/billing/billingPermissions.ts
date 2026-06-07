import type { UserRole } from "@/shared/types/auth";

export function canManageBilling(role?: UserRole | null) {
  return role === "COMPANY_ADMIN";
}

export function canViewBilling(role?: UserRole | null) {
  return role === "COMPANY_ADMIN" || role === "COMPANY_DRIVER";
}

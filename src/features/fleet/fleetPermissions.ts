import type { UserRole } from "@/shared/types/auth";

export function canManageFleet(role?: UserRole | null) {
  return role === "COMPANY_ADMIN";
}

export function canViewFleet(role?: UserRole | null) {
  return role === "COMPANY_ADMIN" || role === "COMPANY_DRIVER";
}

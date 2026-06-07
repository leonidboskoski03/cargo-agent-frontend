import type { VehicleRecord } from "@/shared/api/modules/vehicles";
import type { UserProfile } from "@/shared/api/modules/users";

export function formatDate(value?: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "Open ended";
  return new Intl.DateTimeFormat(undefined, { day: "2-digit", hour: "2-digit", minute: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

export function formatVehicle(vehicle?: VehicleRecord | null) {
  if (!vehicle) return "Unknown vehicle";
  const model = [vehicle.brand, vehicle.model].filter(Boolean).join(" ");
  return `${vehicle.plateNumber} · ${model || vehicle.vehicleType}`;
}

export function formatUser(user?: Pick<UserProfile, "email" | "firstName" | "lastName"> | null) {
  if (!user) return "Unknown user";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ");
  return name ? `${name} · ${user.email}` : user.email;
}

export function compactId(id: string) {
  return id.length > 12 ? `${id.slice(0, 8)}...` : id;
}

import type {
  VehicleMarketplaceInquiryStatus,
  VehicleMarketplaceIntent,
  VehicleMarketplaceListing,
  VehicleMarketplaceListingStatus,
} from "@/shared/api/modules/vehicleMarketplace";
import { humanizeEnum } from "@/shared/lib/formatters";

export function marketplaceStatusTone(status?: VehicleMarketplaceListingStatus | VehicleMarketplaceInquiryStatus | string) {
  if (status === "PUBLISHED" || status === "OPEN") return "success";
  if (status === "DRAFT" || status === "PAUSED" || status === "RESPONDED") return "warning";
  if (status === "CLOSED") return "neutral";
  if (status === "SOLD" || status === "RENTED") return "success";
  return "neutral";
}

export function formatIntent(intent: VehicleMarketplaceIntent | string) {
  return humanizeEnum(intent);
}

export function formatListingOwner(listing?: VehicleMarketplaceListing | null) {
  if (!listing) return "Unknown owner";
  if (listing.ownerCompany) return listing.ownerCompany.name;
  if (listing.ownerUser) return [listing.ownerUser.firstName, listing.ownerUser.lastName].filter(Boolean).join(" ") || "Job seeker";
  return "Unknown owner";
}

export function formatListingLocation(listing?: Pick<VehicleMarketplaceListing, "city" | "countryCode"> | null) {
  if (!listing) return "Not set";
  return [listing.city, listing.countryCode].filter(Boolean).join(", ");
}

export function formatListingPrice(listing?: Pick<VehicleMarketplaceListing, "currency" | "intent" | "priceAmount"> | null) {
  if (!listing?.priceAmount) return listing?.intent === "SALE" ? "Price on request" : "Rate on request";
  return `${listing.priceAmount} ${listing.currency ?? "EUR"}`;
}

export function formatRegistrationStatus(listing?: Pick<VehicleMarketplaceListing, "isRegistered" | "registrationExpiresAt"> | null) {
  if (!listing) return "Not set";
  if (listing.isRegistered === false) return "Unregistered";
  if (listing.isRegistered === true) {
    return listing.registrationExpiresAt ? `Registered until ${listing.registrationExpiresAt.slice(0, 10)}` : "Registered";
  }
  return "Not set";
}

export function formatVehicleSpec(listing?: VehicleMarketplaceListing | null) {
  if (!listing) return "Vehicle";
  const model = [listing.brand, listing.model].filter(Boolean).join(" ");
  const year = listing.year ? ` (${listing.year})` : "";
  return `${model || humanizeEnum(listing.vehicleType)}${year}`;
}

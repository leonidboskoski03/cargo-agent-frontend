import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { MarketplaceBillingMetadata } from "./posts";
import type { VehicleBodyType, VehicleRecord, VehicleType } from "./vehicles";

export type VehicleMarketplaceIntent = "SALE" | "RENTAL" | "LEASE";
export type VehicleMarketplaceSourceType = "FLEET_VEHICLE" | "STANDALONE";
export type VehicleMarketplaceListingStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "SOLD" | "RENTED" | "CLOSED";
export type VehicleMarketplaceInquiryStatus = "OPEN" | "RESPONDED" | "CLOSED";

export type VehicleMarketplaceListing = {
  billing?: MarketplaceBillingMetadata;
  bodyType?: VehicleBodyType | null;
  brand?: string | null;
  capacityKg?: number | null;
  city: string;
  countryCode: string;
  createdAt: string;
  currency?: string | null;
  deletedAt?: string | null;
  description?: string | null;
  documentsJson?: unknown;
  hazmatCertified?: boolean | null;
  id: string;
  imageUrlsJson?: unknown;
  intent: VehicleMarketplaceIntent;
  model?: string | null;
  ownerCompany?: { city?: string | null; countryCode?: string | null; id: string; name: string } | null;
  ownerCompanyId?: string | null;
  ownerUser?: { firstName?: string | null; id: string; lastName?: string | null; role?: string } | null;
  ownerUserId?: string | null;
  priceAmount?: number | string | null;
  refrigerated?: boolean | null;
  sourceType: VehicleMarketplaceSourceType;
  status: VehicleMarketplaceListingStatus;
  title: string;
  updatedAt: string;
  vehicle?: VehicleRecord | null;
  vehicleId?: string | null;
  vehicleType: VehicleType;
  volumeM3?: number | string | null;
  year?: number | null;
};

export type VehicleMarketplaceInquiry = {
  contactEmail?: string | null;
  contactName?: string | null;
  contactPhone?: string | null;
  createdAt: string;
  id: string;
  listing: Pick<VehicleMarketplaceListing, "city" | "countryCode" | "id" | "intent" | "ownerCompanyId" | "ownerUserId" | "status" | "title" | "vehicleType">;
  listingId: string;
  message: string;
  senderCompany?: { id: string; name: string } | null;
  senderCompanyId?: string | null;
  senderUser?: { email?: string | null; firstName?: string | null; id: string; lastName?: string | null; role?: string } | null;
  senderUserId: string;
  status: VehicleMarketplaceInquiryStatus;
  updatedAt: string;
};

export type VehicleMarketplaceFilters = {
  bodyType?: string;
  brand?: string;
  capacityMax?: number;
  capacityMin?: number;
  city?: string;
  countryCode?: string;
  currency?: string;
  hazmatCertified?: boolean;
  includeDeleted?: boolean;
  intent?: string;
  model?: string;
  page?: number;
  pageSize?: number;
  priceMax?: number;
  priceMin?: number;
  q?: string;
  refrigerated?: boolean;
  sourceType?: string;
  status?: string;
  vehicleType?: string;
  yearMax?: number;
  yearMin?: number;
};

export type VehicleMarketplaceListingInput = {
  bodyType?: VehicleBodyType;
  brand?: string;
  capacityKg?: number;
  city: string;
  countryCode: string;
  currency?: string;
  description?: string;
  documentsJson?: unknown;
  hazmatCertified?: boolean;
  imageUrlsJson?: unknown;
  intent: VehicleMarketplaceIntent;
  model?: string;
  priceAmount?: number | string;
  refrigerated?: boolean;
  sourceType: VehicleMarketplaceSourceType;
  status?: VehicleMarketplaceListingStatus;
  title: string;
  vehicleId?: string;
  vehicleType: VehicleType;
  volumeM3?: number | string;
  year?: number;
};

export type VehicleMarketplaceInquiryInput = {
  contactEmail?: string;
  contactName?: string;
  contactPhone?: string;
  message: string;
};

export function listVehicleMarketplaceListings(params?: VehicleMarketplaceFilters) {
  return unwrapData<VehicleMarketplaceListing[]>(apiClient.get("/vehicle-marketplace", { params }));
}

export function listMyVehicleMarketplaceListings(params?: VehicleMarketplaceFilters) {
  return unwrapData<VehicleMarketplaceListing[]>(apiClient.get("/vehicle-marketplace/mine", { params }));
}

export function getVehicleMarketplaceListing(listingId: string) {
  return unwrapData<VehicleMarketplaceListing>(apiClient.get(`/vehicle-marketplace/${listingId}`));
}

export function createVehicleMarketplaceListing(input: VehicleMarketplaceListingInput) {
  return unwrapData<VehicleMarketplaceListing>(apiClient.post("/vehicle-marketplace", input));
}

export function updateVehicleMarketplaceListing(listingId: string, input: Partial<VehicleMarketplaceListingInput>) {
  return unwrapData<VehicleMarketplaceListing>(apiClient.patch(`/vehicle-marketplace/${listingId}`, input));
}

export function deleteVehicleMarketplaceListing(listingId: string) {
  return unwrapData<VehicleMarketplaceListing>(apiClient.delete(`/vehicle-marketplace/${listingId}`));
}

export function restoreVehicleMarketplaceListing(listingId: string) {
  return unwrapData<VehicleMarketplaceListing>(apiClient.post(`/vehicle-marketplace/${listingId}/restore`, {}));
}

export function createVehicleMarketplaceInquiry(listingId: string, input: VehicleMarketplaceInquiryInput) {
  return unwrapData<VehicleMarketplaceInquiry>(apiClient.post(`/vehicle-marketplace/${listingId}/inquiries`, input));
}

export function listVehicleMarketplaceInquiries(params?: { page?: number; pageSize?: number; status?: VehicleMarketplaceInquiryStatus }) {
  return unwrapData<VehicleMarketplaceInquiry[]>(apiClient.get("/vehicle-marketplace/inquiries", { params }));
}

export function updateVehicleMarketplaceInquiry(inquiryId: string, status: VehicleMarketplaceInquiryStatus) {
  return unwrapData<VehicleMarketplaceInquiry>(apiClient.patch(`/vehicle-marketplace/inquiries/${inquiryId}`, { status }));
}

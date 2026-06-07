import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type VehicleType = "TRUCK" | "TRAILER" | "VAN";
export type VehicleBodyType = "TILT" | "BOX" | "FLATBED" | "REEFER" | "TANKER";

export type VehicleRecord = {
  bodyType?: VehicleBodyType | null;
  brand?: string | null;
  capacityKg?: number | null;
  companyId?: string | null;
  countryOfRegistration: string;
  createdAt: string;
  deletedAt?: string | null;
  hazmatCertified?: boolean | null;
  id: string;
  imageUrl?: string | null;
  isActive: boolean;
  model?: string | null;
  plateNumber: string;
  refrigerated?: boolean | null;
  updatedAt: string;
  userId?: string | null;
  vehicleType: VehicleType;
  documentsJson?: unknown;
  volumeM3?: number | string | null;
  year?: number | null;
};

export type VehicleInput = {
  bodyType?: VehicleBodyType;
  brand?: string;
  capacityKg?: number;
  countryOfRegistration: string;
  hazmatCertified?: boolean;
  imageUrl?: string;
  isActive?: boolean;
  model?: string;
  plateNumber: string;
  refrigerated?: boolean;
  vehicleType: VehicleType;
  documentsJson?: unknown;
  volumeM3?: number | string;
  year?: number;
};

export function listVehicles() {
  return unwrapData<VehicleRecord[]>(apiClient.get("/vehicles"));
}

export function getVehicle(vehicleId: string) {
  return unwrapData<VehicleRecord>(apiClient.get(`/vehicles/${vehicleId}`));
}

export function createVehicle(input: VehicleInput) {
  return unwrapData<VehicleRecord>(apiClient.post("/vehicles", input));
}

export function updateVehicle(vehicleId: string, input: Partial<VehicleInput>) {
  return unwrapData<VehicleRecord>(apiClient.patch(`/vehicles/${vehicleId}`, input));
}

export function deleteVehicle(vehicleId: string) {
  return unwrapData<VehicleRecord>(apiClient.delete(`/vehicles/${vehicleId}`));
}

export function restoreVehicle(vehicleId: string) {
  return unwrapData<VehicleRecord>(apiClient.post(`/vehicles/${vehicleId}/restore`, {}));
}

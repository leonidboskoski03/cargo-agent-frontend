import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type ContractStatus = "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";

export type ContractRecord = {
  acceptedBidId: string;
  agreedPriceAmount: string;
  carrierCompany?: {
    city?: string | null;
    countryCode?: string | null;
    id: string;
    name: string;
  };
  carrierCompanyId: string;
  createdAt: string;
  currency: string;
  deletedAt: string | null;
  deliveryActualAt?: string | null;
  deliveryPlannedAt?: string | null;
  id: string;
  pickupActualAt?: string | null;
  pickupPlannedAt?: string | null;
  postId: string;
  post?: {
    cargoDescription?: string | null;
    id: string;
    status: string;
    title?: string | null;
  };
  route?: {
    destinationLocation: {
      city: string;
      countryCode: string;
      id: string;
    };
    distanceKm?: number | null;
    estimatedDurationMinutes?: number | null;
    id: string;
    originLocation: {
      city: string;
      countryCode: string;
      id: string;
    };
  };
  routeId: string;
  shipperCompany?: {
    city?: string | null;
    countryCode?: string | null;
    id: string;
    name: string;
  };
  shipperCompanyId: string;
  status: ContractStatus;
  updatedAt: string;
};

export type CreateContractInput = {
  acceptedBidId: string;
  deliveryPlannedAt?: string;
  pickupPlannedAt?: string;
  postId: string;
};

export type UpdateContractTimelineInput = {
  deliveryActualAt?: string;
  deliveryPlannedAt?: string;
  pickupActualAt?: string;
  pickupPlannedAt?: string;
};

export type ContractListParams = {
  deleted?: "active" | "only" | "include";
  status?: ContractStatus;
};

export function listContracts(params?: ContractListParams) {
  return unwrapData<ContractRecord[]>(apiClient.get("/contracts", { params }));
}

export function getContract(contractId: string) {
  return unwrapData<ContractRecord>(apiClient.get(`/contracts/${contractId}`));
}

export function createContract(input: CreateContractInput) {
  return unwrapData<ContractRecord>(apiClient.post("/contracts", input));
}

export function changeContractStatus(contractId: string, status: ContractStatus) {
  return unwrapData<ContractRecord>(apiClient.patch(`/contracts/${contractId}/status`, { status }));
}

export function updateContractTimeline(contractId: string, input: UpdateContractTimelineInput) {
  return unwrapData<ContractRecord>(apiClient.patch(`/contracts/${contractId}/timeline`, input));
}

export function deleteContract(contractId: string) {
  return unwrapData<ContractRecord>(apiClient.delete(`/contracts/${contractId}`));
}

export function restoreContract(contractId: string) {
  return unwrapData<ContractRecord>(apiClient.post(`/contracts/${contractId}/restore`, {}));
}

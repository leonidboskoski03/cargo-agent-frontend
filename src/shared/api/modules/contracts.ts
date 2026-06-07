import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type ContractStatus = "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "DISPUTED";

export type ContractRecord = {
  acceptedBidId: string;
  agreedPriceAmount: string;
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
  routeId: string;
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

export function listContracts(params?: { status?: ContractStatus }) {
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

export function deleteContract(contractId: string) {
  return unwrapData<ContractRecord>(apiClient.delete(`/contracts/${contractId}`));
}

export function restoreContract(contractId: string) {
  return unwrapData<ContractRecord>(apiClient.post(`/contracts/${contractId}/restore`, {}));
}

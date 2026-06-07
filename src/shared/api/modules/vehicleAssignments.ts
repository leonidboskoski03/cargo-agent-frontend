import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { UserRole } from "@/shared/types/auth";

export type VehicleAssignmentRecord = {
  createdAt: string;
  deletedAt?: string | null;
  driverUser?: {
    companyId: string | null;
    deletedAt?: string | null;
    id: string;
    role: UserRole;
  };
  driverUserId: string;
  endsAt?: string | null;
  id: string;
  startsAt: string;
  updatedAt: string;
  vehicle?: {
    companyId: string | null;
    deletedAt?: string | null;
    id: string;
    userId: string | null;
  };
  vehicleId: string;
};

export type VehicleAssignmentInput = {
  driverUserId: string;
  endsAt?: string | null;
  startsAt: string;
  vehicleId: string;
};

export function listVehicleAssignments() {
  return unwrapData<VehicleAssignmentRecord[]>(apiClient.get("/vehicle-assignments"));
}

export function getVehicleAssignment(assignmentId: string) {
  return unwrapData<VehicleAssignmentRecord>(apiClient.get(`/vehicle-assignments/${assignmentId}`));
}

export function createVehicleAssignment(input: VehicleAssignmentInput) {
  return unwrapData<VehicleAssignmentRecord>(apiClient.post("/vehicle-assignments", input));
}

export function updateVehicleAssignment(assignmentId: string, input: Partial<VehicleAssignmentInput>) {
  return unwrapData<VehicleAssignmentRecord>(apiClient.patch(`/vehicle-assignments/${assignmentId}`, input));
}

export function deleteVehicleAssignment(assignmentId: string) {
  return unwrapData<VehicleAssignmentRecord>(apiClient.delete(`/vehicle-assignments/${assignmentId}`));
}

export function restoreVehicleAssignment(assignmentId: string) {
  return unwrapData<VehicleAssignmentRecord>(apiClient.post(`/vehicle-assignments/${assignmentId}/restore`, {}));
}

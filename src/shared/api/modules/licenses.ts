import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { UserRole } from "@/shared/types/auth";

export type LicenseRecord = {
  createdAt: string;
  deletedAt?: string | null;
  expiresAt?: string | null;
  id: string;
  imageUrl?: string | null;
  isValid: boolean;
  issuedAt?: string | null;
  licenseType: string;
  documentUrl?: string | null;
  updatedAt: string;
  user?: {
    companyId: string | null;
    id: string;
    role: UserRole;
  };
  userId: string;
};

export type LicenseInput = {
  expiresAt?: string;
  isValid?: boolean;
  imageUrl?: string;
  issuedAt?: string;
  licenseType: string;
  documentUrl?: string;
  userId?: string;
};

export type LicenseTypeOption = {
  code: string;
  label: string;
};

export function listLicenses(params?: { userId?: string }) {
  return unwrapData<LicenseRecord[]>(apiClient.get("/licenses", { params }));
}

export function listLicenseTypes() {
  return unwrapData<LicenseTypeOption[]>(apiClient.get("/licenses/types"));
}

export function getLicense(licenseId: string) {
  return unwrapData<LicenseRecord>(apiClient.get(`/licenses/${licenseId}`));
}

export function createLicense(input: LicenseInput) {
  return unwrapData<LicenseRecord>(apiClient.post("/licenses", input));
}

export function updateLicense(licenseId: string, input: Partial<LicenseInput>) {
  return unwrapData<LicenseRecord>(apiClient.patch(`/licenses/${licenseId}`, input));
}

export function deleteLicense(licenseId: string) {
  return unwrapData<LicenseRecord>(apiClient.delete(`/licenses/${licenseId}`));
}

export function restoreLicense(licenseId: string) {
  return unwrapData<LicenseRecord>(apiClient.post(`/licenses/${licenseId}/restore`, {}));
}

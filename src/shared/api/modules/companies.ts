import { apiClient, unwrapData } from "@/shared/api/apiClient";

export type Company = {
  address?: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  city: string;
  companyType: "SHIPPER" | "CARRIER" | "BOTH";
  countryCode: string;
  createdAt?: string;
  currentPlanId?: string | null;
  deletedAt?: string | null;
  email?: string | null;
  employeeCount?: number | null;
  foundedAt?: string | null;
  id: string;
  isVerified: boolean;
  verificationCheckedAt?: string | null;
  verificationFailureReason?: string | null;
  verificationProvider?: string | null;
  verificationStatus: "UNVERIFIED" | "PENDING" | "VERIFIED" | "FAILED" | "NEEDS_REVIEW";
  logoUrl?: string | null;
  name: string;
  phone?: string | null;
  registrationNumber: string;
  stripeCustomerId?: string | null;
  subscriptionStatus?: string | null;
  updatedAt?: string;
  vatNumber?: string | null;
  website?: string | null;
};

export type CompanyUpdateInput = Partial<{
  address: string | null;
  bannerUrl: string | null;
  bio: string | null;
  city: string;
  companyType: Company["companyType"];
  countryCode: string;
  email: string | null;
  employeeCount: number | null;
  foundedAt: string | null;
  logoUrl: string | null;
  name: string;
  phone: string | null;
  registrationNumber: string;
  vatNumber: string | null;
  website: string | null;
}>;

export function getMyCompany() {
  return unwrapData<Company>(apiClient.get("/companies/me"));
}

export function updateMyCompany(input: CompanyUpdateInput) {
  return unwrapData<Company>(apiClient.patch("/companies/me", input));
}

export function requestMyCompanyVerification() {
  return unwrapData<Company>(apiClient.post("/companies/me/verification", {}));
}

export function deleteMyCompany() {
  return unwrapData<Company>(apiClient.delete("/companies/me"));
}

export function restoreCompany(companyId: string) {
  return unwrapData<Company>(apiClient.post(`/companies/${companyId}/restore`, {}));
}

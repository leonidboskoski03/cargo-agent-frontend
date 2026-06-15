import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { UserRole } from "@/shared/types/auth";

export type InviteStatus = "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";

export type CompanyInvite = {
  acceptedAt?: string | null;
  acceptedByUser?: { email: string; firstName: string; id: string; lastName: string } | null;
  companyId: string;
  createdAt: string;
  expiresAt: string;
  id: string;
  invitedByUser?: { email: string; firstName: string; id: string; lastName: string } | null;
  invitedEmail: string;
  revokedAt?: string | null;
  status: InviteStatus;
  targetRole: Extract<UserRole, "COMPANY_ADMIN" | "COMPANY_DRIVER">;
};

export type CreateInviteInput = {
  invitedEmail: string;
  targetRole: CompanyInvite["targetRole"];
};

export type AcceptCompanyInviteInput = {
  otpChallengeId: string;
  token: string;
};

export type CompanyInvitePreview = {
  company: {
    id: string;
    name: string;
  };
  companyId: string;
  expiresAt: string;
  id: string;
  invitedEmail: string;
  status: InviteStatus;
  targetRole: CompanyInvite["targetRole"];
};

export type AcceptCompanyInviteResponse = {
  invite: CompanyInvite;
  nextAction: {
    message: string;
    type: "REFRESH_AUTH_SESSION";
  };
  user: unknown;
};

export function listCompanyInvites(params?: { status?: InviteStatus }) {
  return unwrapData<CompanyInvite[]>(apiClient.get("/company-invites", { params }));
}

export function createCompanyInvite(input: CreateInviteInput) {
  return unwrapData<CompanyInvite>(apiClient.post("/company-invites", input));
}

export function previewCompanyInvite(token: string) {
  return unwrapData<CompanyInvitePreview>(apiClient.get("/company-invites/preview", { params: { token } }));
}

export function revokeCompanyInvite(inviteId: string) {
  return unwrapData<CompanyInvite>(apiClient.post(`/company-invites/${inviteId}/revoke`, {}));
}

export function acceptCompanyInvite(input: AcceptCompanyInviteInput) {
  return unwrapData<AcceptCompanyInviteResponse>(apiClient.post("/company-invites/accept", input));
}

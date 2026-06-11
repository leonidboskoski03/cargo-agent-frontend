export type UserRole = "COMPANY_ADMIN" | "COMPANY_DRIVER" | "JOB_SEEKER";

export type AuthUser = {
  id: string;
  companyId: string | null;
  role: UserRole;
  firstName: string;
  lastName: string;
  email: string;
  imageUrl?: string | null;
};

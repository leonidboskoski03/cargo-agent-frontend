import { apiClient, unwrapData } from "@/shared/api/apiClient";
import type { AuthUser } from "@/shared/types/auth";

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse =
  | { user: AuthUser }
  | {
      challengeId: string;
      expiresAt: string;
      nextResendAt?: string;
      nextAction: { purpose: "LOGIN_MFA"; type: "MFA_REQUIRED" };
      resendAttemptsRemaining?: number;
      user: AuthUser;
    };

export type RegistrationStartInput = {
  email: string;
  firstName: string;
  kind: "COMPANY" | "JOB_SEEKER";
  lastName: string;
  password: string;
  phone: string;
};

export type RegistrationStartResponse = {
  challengeId: string;
  draftId: string;
  expiresAt: string;
  nextResendAt?: string;
  nextAction: { purpose: "REGISTER_VERIFY"; type: "VERIFY_OTP" };
  resendAttemptsRemaining?: number;
};

export type OtpPurpose = "REGISTER_VERIFY" | "FORGOT_PASSWORD" | "INVITE_ACCEPT" | "CHANGE_PASSWORD" | "LOGIN_MFA";
export type OtpChannel = "EMAIL" | "SMS";

export type OtpChallengeResponse = {
  accepted: true;
  challengeId: string;
  code?: string;
  expiresAt: string;
  nextResendAt?: string;
  nextAction: { purpose?: OtpPurpose; type: string };
  resendAttemptsRemaining?: number;
};

export type RequestOtpInput = {
  channel: OtpChannel;
  email?: string;
  phone?: string;
  purpose: OtpPurpose;
};

export type ForgotPasswordResponse = {
  challengeId?: string;
  code?: string;
  expiresAt?: string;
  message: string;
  nextResendAt?: string;
  nextAction: { purpose: "FORGOT_PASSWORD"; type: "VERIFY_OTP" };
  resendAttemptsRemaining?: number;
};

export type RegisterInput = {
  email: string;
  firstName: string;
  lastName: string;
  otpChallengeId: string;
  password: string;
  role?: "JOB_SEEKER";
};

export type CompleteCompanyRegistrationInput = {
  address?: string;
  city: string;
  companyEmail?: string;
  companyName: string;
  companyType: "SHIPPER" | "CARRIER" | "BOTH";
  contactPhone?: string;
  countryCode: string;
  draftId: string;
  planCode?: "FREE" | "PRO";
  registrationNumber: string;
  vatNumber?: string;
  website?: string;
};

export type CompleteJobSeekerRegistrationInput = {
  availability?: string;
  city?: string;
  countryCode?: string;
  draftId: string;
  headline?: string;
  preferredRoutes?: string[];
  yearsExperience?: number;
};

export function login(input: LoginInput) {
  return unwrapData<LoginResponse>(apiClient.post("/auth/login", input));
}

export function loginVerifyOtp(input: LoginInput & { otpChallengeId: string }) {
  return unwrapData<{ user: AuthUser }>(apiClient.post("/auth/login/verify-otp", input));
}

export function forgotPassword(input: { email: string }) {
  return unwrapData<ForgotPasswordResponse>(apiClient.post("/auth/forgot-password", input));
}

export function resetPassword(input: { newPassword: string; otpChallengeId: string }) {
  return unwrapData<{ message: string }>(apiClient.post("/auth/reset-password", input));
}

export function changePassword(input: { currentPassword: string; newPassword: string }) {
  return unwrapData<{ message: string }>(apiClient.post("/auth/change-password", input));
}

export function register(input: RegisterInput) {
  return unwrapData<{ user: AuthUser }>(apiClient.post("/auth/register", input));
}

export function refreshSession() {
  return unwrapData<{ message: string }>(apiClient.post("/auth/refresh", {}));
}

export function logout() {
  return unwrapData<{ message: string }>(apiClient.post("/auth/logout", {}));
}

export function startCompanyRegistration(input: RegistrationStartInput) {
  return unwrapData<RegistrationStartResponse>(apiClient.post("/auth/registration/start", input));
}

export function verifyRegistrationOtp(input: { code: string; draftId: string }) {
  return unwrapData<{ draftId: string; kind: "COMPANY" | "JOB_SEEKER"; nextAction: { type: string }; otpVerified: true }>(
    apiClient.post("/auth/registration/verify-otp", input),
  );
}

export function requestOtp(input: RequestOtpInput) {
  return unwrapData<OtpChallengeResponse>(apiClient.post("/auth/otp/request", input));
}

export function verifyOtp(input: { challengeId: string; code: string }) {
  return unwrapData<{ challengeId: string; channel: string; nextAction: { type: string }; purpose: string }>(
    apiClient.post("/auth/otp/verify", input),
  );
}

export function resendOtp(input: { challengeId: string }) {
  return unwrapData<OtpChallengeResponse>(apiClient.post("/auth/otp/resend", input));
}

export function completeCompanyRegistration(input: CompleteCompanyRegistrationInput) {
  return unwrapData<{ checkout: null | { checkoutUrl?: string }; company: unknown; user: AuthUser }>(
    apiClient.post("/auth/registration/complete-company", input),
  );
}

export function completeJobSeekerRegistration(input: CompleteJobSeekerRegistrationInput) {
  return unwrapData<{ nextAction?: { type: string }; user: AuthUser }>(
    apiClient.post("/auth/registration/complete-job-seeker", input),
  );
}

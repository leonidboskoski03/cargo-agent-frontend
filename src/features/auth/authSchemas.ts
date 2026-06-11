import { z } from "zod";
import { optionalStringSchema } from "@/shared/lib/forms";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export const mfaSchema = z.object({
  code: z.string().trim().min(4, "Enter the OTP code.").max(8),
});

export const forgotPasswordEmailSchema = z.object({
  email: z.string().email("Enter a valid email address."),
});

export const forgotPasswordResetSchema = z.object({
  code: z.string().trim().min(4, "Enter the OTP code.").max(8),
  confirmPassword: z.string().min(8, "Confirm your new password."),
  newPassword: z.string().min(8, "Password must be at least 8 characters.").max(120),
}).refine((value) => value.newPassword === value.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

export const registrationStartSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  password: z.string().min(8, "Password must be at least 8 characters.").max(120),
  phone: optionalStringSchema.pipe(z.string().min(5).max(40).optional()),
});

export const registrationOtpSchema = z.object({
  code: z.string().trim().min(4, "Enter the OTP code.").max(8),
});

export const inviteAcceptSchema = z.object({
  token: z.string().trim().min(20, "Invite token is missing or invalid.").max(200),
});

export const inviteAcceptOtpSchema = z.object({
  code: z.string().trim().min(4, "Enter the invite OTP code.").max(8),
});

export const inviteAccountSetupSchema = z.object({
  email: z.string().trim().email("Enter the invited email address.").transform((value) => value.toLowerCase()),
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  password: z.string().min(8, "Password must be at least 8 characters.").max(120),
});

export const inviteAccountOtpSchema = z.object({
  code: z.string().trim().min(4, "Enter the account setup OTP code.").max(8),
});

export const companyProfileSchema = z.object({
  address: z.string().trim().min(2, "Company address is required.").max(255),
  city: z.string().trim().min(1, "City is required.").max(120),
  companyEmail: optionalStringSchema.pipe(z.string().email().optional()),
  companyName: z.string().trim().min(2, "Company name is required.").max(120),
  companyType: z.enum(["SHIPPER", "CARRIER", "BOTH"]),
  contactPhone: optionalStringSchema.pipe(z.string().min(5).max(40).optional()),
  countryCode: z.string().trim().length(2, "Use a two-letter country code.").transform((value) => value.toUpperCase()),
  planCode: z.enum(["FREE", "PRO"]),
  registrationNumber: z.string().trim().min(3, "Registration number is required.").max(100),
  vatNumber: optionalStringSchema.pipe(z.string().min(3).max(120).optional()),
  website: optionalStringSchema.pipe(z.string().url().optional()),
});

export const jobSeekerProfileSchema = z.object({
  availability: optionalStringSchema.pipe(z.string().min(1).max(120).optional()),
  city: z.string().trim().min(1, "City is required.").max(120),
  countryCode: z.string().trim().length(2, "Use a two-letter country code.").transform((value) => value.toUpperCase()),
  headline: optionalStringSchema.pipe(z.string().min(1).max(180).optional()),
  preferredRoutesText: optionalStringSchema,
  yearsExperience: z.preprocess(
    (value) => value === "" || value === null ? undefined : value,
    z.coerce.number().int().min(0).max(60).optional(),
  ),
}).transform((value) => ({
  availability: value.availability,
  city: value.city,
  countryCode: value.countryCode,
  headline: value.headline,
  preferredRoutes: value.preferredRoutesText
    ? value.preferredRoutesText.split(/\r?\n|,/).map((route) => route.trim()).filter(Boolean).slice(0, 20)
    : undefined,
  yearsExperience: value.yearsExperience,
}));

export type LoginFormValues = z.output<typeof loginSchema>;
export type MfaFormValues = z.output<typeof mfaSchema>;
export type ForgotPasswordEmailValues = z.output<typeof forgotPasswordEmailSchema>;
export type ForgotPasswordResetValues = z.output<typeof forgotPasswordResetSchema>;
export type RegistrationStartInput = z.input<typeof registrationStartSchema>;
export type RegistrationStartValues = z.output<typeof registrationStartSchema>;
export type RegistrationOtpValues = z.output<typeof registrationOtpSchema>;
export type InviteAcceptValues = z.output<typeof inviteAcceptSchema>;
export type InviteAcceptOtpValues = z.output<typeof inviteAcceptOtpSchema>;
export type InviteAccountSetupInput = z.input<typeof inviteAccountSetupSchema>;
export type InviteAccountSetupValues = z.output<typeof inviteAccountSetupSchema>;
export type InviteAccountOtpValues = z.output<typeof inviteAccountOtpSchema>;
export type CompanyProfileInput = z.input<typeof companyProfileSchema>;
export type CompanyProfileValues = z.output<typeof companyProfileSchema>;
export type JobSeekerProfileInput = z.input<typeof jobSeekerProfileSchema>;
export type JobSeekerProfileValues = z.output<typeof jobSeekerProfileSchema>;

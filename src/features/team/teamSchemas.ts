import { z } from "zod";
import { optionalStringSchema } from "@/shared/lib/forms";

export const userProfileSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required.").max(80),
  isActive: z.boolean().optional(),
  lastName: z.string().trim().min(1, "Last name is required.").max(80),
  phone: optionalStringSchema.pipe(z.string().min(5).max(40).optional()).transform((value) => value ?? null),
});

export const membershipSchema = z.object({
  companyId: z.string().nullable(),
  role: z.enum(["COMPANY_ADMIN", "COMPANY_DRIVER", "JOB_SEEKER"]),
});

export const inviteSchema = z.object({
  invitedEmail: z.string().trim().email("Enter a valid email."),
  targetRole: z.enum(["COMPANY_ADMIN", "COMPANY_DRIVER"]),
});

export type InviteFormInput = z.input<typeof inviteSchema>;
export type InviteFormValues = z.output<typeof inviteSchema>;
export type MembershipFormInput = z.input<typeof membershipSchema>;
export type MembershipFormValues = z.output<typeof membershipSchema>;
export type UserProfileFormInput = z.input<typeof userProfileSchema>;
export type UserProfileFormValues = z.output<typeof userProfileSchema>;

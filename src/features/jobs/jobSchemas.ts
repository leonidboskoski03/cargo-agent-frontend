import { z } from "zod";

export const jobApplicationSchema = z.object({
  currency: z.string().trim().length(3, "Currency must use 3 letters.").optional().or(z.literal("")),
  description: z.string().trim().max(5000, "Description is too long.").optional(),
  expectedPayAmount: z.string().trim().refine((value) => !value || Number(value) > 0, "Expected pay must be positive.").optional(),
  preferredCity: z.string().trim().max(120, "City is too long.").optional(),
  preferredCountryCode: z.string().trim().length(2, "Use a two-letter country code.").optional().or(z.literal("")),
  title: z.string().trim().min(3, "Title is required.").max(160, "Title is too long."),
}).transform((values) => ({
  currency: values.currency ? values.currency.toUpperCase() : undefined,
  description: values.description || undefined,
  expectedPayAmount: values.expectedPayAmount ? Number(values.expectedPayAmount) : undefined,
  preferredCity: values.preferredCity || undefined,
  preferredCountryCode: values.preferredCountryCode ? values.preferredCountryCode.toUpperCase() : undefined,
  title: values.title,
}));

export const jobApplySchema = z.object({
  documentName: z.string().trim().max(120, "Document name is too long.").optional(),
  documentUrl: z.string().trim().url("Upload a valid document.").optional().or(z.literal("")),
  message: z.string().trim().max(2000, "Message is too long.").optional(),
}).transform((values) => ({
  documentName: values.documentName || undefined,
  documentUrl: values.documentUrl || undefined,
  message: values.message || undefined,
}));

export type JobApplicationFormInput = z.input<typeof jobApplicationSchema>;
export type JobApplicationFormValues = z.output<typeof jobApplicationSchema>;
export type JobApplyFormInput = z.input<typeof jobApplySchema>;
export type JobApplyFormValues = z.output<typeof jobApplySchema>;

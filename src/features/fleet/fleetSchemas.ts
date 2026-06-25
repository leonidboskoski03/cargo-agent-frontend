import { z } from "zod";

const optionalTrimmed = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return Number(value);
}, z.number().finite().optional());

const optionalDate = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  return value.trim() === "" ? undefined : value;
}, z.string().optional());

const optionalUrl = optionalTrimmed.pipe(z.string().url("Enter a valid URL.").optional());

export const vehicleSchema = z.object({
  brand: optionalTrimmed,
  countryOfRegistration: z.string().trim().length(2, "Use a two-letter country code.").transform((value) => value.toUpperCase()),
  imageUrl: optionalUrl,
  documentsJson: optionalTrimmed,
  isActive: z.boolean().optional(),
  model: optionalTrimmed,
  plateNumber: z.string().trim().min(2, "Plate number is required.").max(40),
  vehicleType: z.enum(["TRUCK", "TRAILER", "VAN"]),
  year: optionalNumber.pipe(z.number().int().min(1950).max(2100).optional()),
});

export const licenseSchema = z
  .object({
    expiresAt: optionalDate,
    isValid: z.boolean().optional(),
    issuedAt: optionalDate,
    licenseType: z.string().trim().min(1, "License type is required.").max(120),
    imageUrl: optionalUrl,
    documentUrl: optionalUrl,
    userId: optionalTrimmed,
  })
  .superRefine((value, ctx) => {
    if (value.issuedAt && value.expiresAt && new Date(value.expiresAt) <= new Date(value.issuedAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Expiry must be after issued date.", path: ["expiresAt"] });
    }
  });

export const assignmentSchema = z
  .object({
    driverUserId: z.string().trim().min(1, "Driver is required."),
    endsAt: optionalDate.nullable(),
    startsAt: z.string().trim().min(1, "Start date is required."),
    vehicleId: z.string().trim().min(1, "Vehicle is required."),
  })
  .superRefine((value, ctx) => {
    if (value.endsAt && new Date(value.endsAt) <= new Date(value.startsAt)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "End must be after start.", path: ["endsAt"] });
    }
  });

export type AssignmentFormInput = z.input<typeof assignmentSchema>;
export type AssignmentFormValues = z.output<typeof assignmentSchema>;
export type LicenseFormInput = z.input<typeof licenseSchema>;
export type LicenseFormValues = z.output<typeof licenseSchema>;
export type VehicleFormInput = z.input<typeof vehicleSchema>;
export type VehicleFormValues = z.output<typeof vehicleSchema>;

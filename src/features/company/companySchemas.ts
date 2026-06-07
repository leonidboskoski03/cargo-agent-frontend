import { z } from "zod";
import { countryCodeSchema, optionalNumberSchema, optionalStringSchema } from "@/shared/lib/forms";

const nullableOptionalString = optionalStringSchema.transform((value) => value ?? null);
const dataImageSchema = z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/i, "Use a PNG, JPG, or WebP image.");
const nullableUrl = optionalStringSchema
  .pipe(z.union([z.string().url("Enter a valid URL."), dataImageSchema]).optional())
  .transform((value) => value ?? null);

export const companySchema = z.object({
  address: nullableOptionalString,
  bio: optionalStringSchema.pipe(z.string().max(2000).optional()).transform((value) => value ?? null),
  city: z.string().trim().min(1, "City is required.").max(120),
  companyType: z.enum(["SHIPPER", "CARRIER", "BOTH"]),
  countryCode: countryCodeSchema,
  email: optionalStringSchema.pipe(z.string().email("Enter a valid email.").optional()).transform((value) => value ?? null),
  employeeCount: optionalNumberSchema.transform((value) => value ?? null),
  logoUrl: nullableUrl,
  name: z.string().trim().min(2, "Company name is required.").max(160),
  phone: nullableOptionalString,
  registrationNumber: z.string().trim().min(3, "Registration number is required.").max(80),
  vatNumber: nullableOptionalString,
  website: nullableUrl,
});

export type CompanyFormInput = z.input<typeof companySchema>;
export type CompanyFormValues = z.output<typeof companySchema>;

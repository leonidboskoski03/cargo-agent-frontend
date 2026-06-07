import { z } from "zod";

const optionalTrimmed = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

export const notificationFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z.coerce.boolean().optional(),
});

export const documentCreateSchema = z.object({
  kind: z.enum(["COMPANY_LICENSE", "VEHICLE_REGISTRATION", "INSURANCE", "CONTRACT_ATTACHMENT", "OTHER"]),
  metadataJson: optionalTrimmed,
  mimeType: z.string().trim().min(3).max(120),
  name: z.string().trim().min(1, "Document name is required.").max(200),
  ownerCompanyId: optionalTrimmed,
  ownerUserId: optionalTrimmed,
  url: z.string().trim().url("Use a valid document URL."),
});

export const documentFilterSchema = z.object({
  kind: z.enum(["COMPANY_LICENSE", "VEHICLE_REGISTRATION", "INSURANCE", "CONTRACT_ATTACHMENT", "OTHER"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export const auditFilterSchema = z.object({
  action: optionalTrimmed,
  actorId: optionalTrimmed,
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditFilterValues = z.output<typeof auditFilterSchema>;
export type DocumentCreateValues = z.output<typeof documentCreateSchema>;
export type DocumentFilterValues = z.output<typeof documentFilterSchema>;
export type NotificationFilterValues = z.output<typeof notificationFilterSchema>;

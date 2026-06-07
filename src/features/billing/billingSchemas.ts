import { z } from "zod";

const optionalTrimmed = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

export const checkoutSchema = z.object({
  idempotencyKey: optionalTrimmed.pipe(z.string().min(8).max(120).optional()),
  planCode: z.enum(["PRO"], { message: "Select a paid sandbox plan." }),
});

export const cancelReasonSchema = z.object({
  reason: optionalTrimmed.pipe(z.string().max(500).optional()),
});

export const billingEventsFilterSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type BillingEventsFilterValues = z.output<typeof billingEventsFilterSchema>;
export type CancelReasonValues = z.output<typeof cancelReasonSchema>;
export type CheckoutValues = z.output<typeof checkoutSchema>;

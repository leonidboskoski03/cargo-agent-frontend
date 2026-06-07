import { z } from "zod";

const optionalTrimmed = z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().optional());

export const reviewCreateSchema = z.object({
  comment: optionalTrimmed.pipe(z.string().max(2000).optional()),
  contractId: z.string().trim().min(1, "Completed contract is required."),
  rating: z.coerce.number().int().min(1).max(5),
  status: z.enum(["DRAFT", "PUBLISHED", "WITHDRAWN"]).optional(),
});

export const reviewUpdateSchema = z
  .object({
    comment: z.preprocess((value) => {
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed === "" ? null : trimmed;
    }, z.string().max(2000).nullable().optional()),
    rating: z.coerce.number().int().min(1).max(5).optional(),
  })
  .refine((value) => value.rating !== undefined || value.comment !== undefined, "At least one field must be provided.");

export const reviewStatusSchema = z.object({
  status: z.enum(["DRAFT", "PUBLISHED", "WITHDRAWN"]),
});

export const reviewFilterSchema = z.object({
  contractId: optionalTrimmed,
  status: z.enum(["DRAFT", "PUBLISHED", "WITHDRAWN"]).optional(),
});

export type ReviewCreateValues = z.output<typeof reviewCreateSchema>;
export type ReviewFilterValues = z.output<typeof reviewFilterSchema>;
export type ReviewStatusValues = z.output<typeof reviewStatusSchema>;
export type ReviewUpdateValues = z.output<typeof reviewUpdateSchema>;

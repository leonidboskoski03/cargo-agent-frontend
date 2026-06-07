import { z } from "zod";
import { currencySchema, optionalNumberSchema, optionalStringSchema } from "@/shared/lib/forms";

export const postSchema = z
  .object({
    cargoDescription: optionalStringSchema.pipe(z.string().max(2000).optional()),
    cargoType: optionalStringSchema.pipe(z.string().max(120).optional()),
    currency: currencySchema,
    description: optionalStringSchema.pipe(z.string().max(4000).optional()),
    priceAmount: optionalStringSchema,
    priceType: z.enum(["FIXED", "NEGOTIABLE", "REQUEST_QUOTE"]),
    routeId: z.string().min(1, "Route is required."),
    title: optionalStringSchema.pipe(z.string().min(1).max(180).optional()),
    weightKg: optionalNumberSchema,
  })
  .refine((body) => body.priceType === "REQUEST_QUOTE" || Boolean(body.priceAmount), {
    message: "Price amount is required for fixed or negotiable posts.",
    path: ["priceAmount"],
  });

export type PostFormInput = z.input<typeof postSchema>;
export type PostFormValues = z.output<typeof postSchema>;

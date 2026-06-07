import { z } from "zod";
import { currencySchema, optionalStringSchema } from "@/shared/lib/forms";

export const bidSchema = z
  .object({
    currency: currencySchema,
    estimatedDeliveryAt: optionalStringSchema,
    estimatedPickupAt: optionalStringSchema,
    message: optionalStringSchema.pipe(z.string().max(2000).optional()),
    offeredPriceAmount: optionalStringSchema,
    postId: z.string().min(1, "Post is required."),
  })
  .refine(
    (body) =>
      !body.estimatedPickupAt ||
      !body.estimatedDeliveryAt ||
      new Date(body.estimatedDeliveryAt).getTime() >= new Date(body.estimatedPickupAt).getTime(),
    {
      message: "Delivery estimate must be after pickup.",
      path: ["estimatedDeliveryAt"],
    },
  );

export type BidFormInput = z.input<typeof bidSchema>;
export type BidFormValues = z.output<typeof bidSchema>;

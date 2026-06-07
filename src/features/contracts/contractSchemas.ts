import { z } from "zod";
import { optionalStringSchema } from "@/shared/lib/forms";

export const contractSchema = z
  .object({
    acceptedBidId: z.string().min(1, "Accepted bid is required."),
    deliveryPlannedAt: optionalStringSchema,
    pickupPlannedAt: optionalStringSchema,
    postId: z.string().min(1, "Post is required."),
  })
  .refine(
    (body) =>
      !body.pickupPlannedAt ||
      !body.deliveryPlannedAt ||
      new Date(body.deliveryPlannedAt).getTime() >= new Date(body.pickupPlannedAt).getTime(),
    {
      message: "Delivery planned date must be after pickup planned date.",
      path: ["deliveryPlannedAt"],
    },
  );

export type ContractFormInput = z.input<typeof contractSchema>;
export type ContractFormValues = z.output<typeof contractSchema>;

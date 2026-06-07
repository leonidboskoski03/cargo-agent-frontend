import { describe, expect, it } from "vitest";
import { bidSchema } from "./bidSchemas";

describe("bid validation", () => {
  it("requires a post and a three-letter currency", () => {
    expect(bidSchema.safeParse({ currency: "EUR", postId: "" }).success).toBe(false);
    expect(bidSchema.safeParse({ currency: "EU", postId: "post_1" }).success).toBe(false);
    expect(bidSchema.safeParse({ currency: "eur", postId: "post_1" }).success).toBe(true);
  });

  it("keeps optional message fields out of the backend payload when blank", () => {
    const parsed = bidSchema.parse({ currency: "EUR", message: "", postId: "post_1" });
    expect(parsed.message).toBeUndefined();
  });

  it("requires delivery estimate to be after pickup estimate", () => {
    expect(
      bidSchema.safeParse({
        currency: "EUR",
        estimatedDeliveryAt: "2026-06-05T10:00",
        estimatedPickupAt: "2026-06-05T12:00",
        postId: "post_1",
      }).success,
    ).toBe(false);
    expect(
      bidSchema.safeParse({
        currency: "EUR",
        estimatedDeliveryAt: "2026-06-05T14:00",
        estimatedPickupAt: "2026-06-05T12:00",
        postId: "post_1",
      }).success,
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { contractSchema } from "./contractSchemas";

describe("contract validation", () => {
  it("requires a post and accepted bid", () => {
    expect(contractSchema.safeParse({ acceptedBidId: "", postId: "post_1" }).success).toBe(false);
    expect(contractSchema.safeParse({ acceptedBidId: "bid_1", postId: "" }).success).toBe(false);
    expect(contractSchema.safeParse({ acceptedBidId: "bid_1", postId: "post_1" }).success).toBe(true);
  });

  it("requires delivery planned date to be after pickup planned date", () => {
    expect(
      contractSchema.safeParse({
        acceptedBidId: "bid_1",
        deliveryPlannedAt: "2026-06-05T10:00",
        pickupPlannedAt: "2026-06-05T12:00",
        postId: "post_1",
      }).success,
    ).toBe(false);
    expect(
      contractSchema.safeParse({
        acceptedBidId: "bid_1",
        deliveryPlannedAt: "2026-06-05T14:00",
        pickupPlannedAt: "2026-06-05T12:00",
        postId: "post_1",
      }).success,
    ).toBe(true);
  });
});

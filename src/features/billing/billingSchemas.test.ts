import { describe, expect, it } from "vitest";
import { billingEventsFilterSchema, cancelReasonSchema, checkoutSchema } from "./billingSchemas";

describe("billing schemas", () => {
  it("accepts paid checkout plan with optional idempotency key", () => {
    const parsed = checkoutSchema.parse({ idempotencyKey: "checkout-key-001", planCode: "PRO" });
    expect(parsed).toEqual({ idempotencyKey: "checkout-key-001", planCode: "PRO" });
  });

  it("rejects free checkout and short idempotency keys", () => {
    expect(() => checkoutSchema.parse({ idempotencyKey: "short", planCode: "FREE" })).toThrow();
  });

  it("caps cancel reason and billing pagination", () => {
    expect(cancelReasonSchema.parse({ reason: "" })).toEqual({ reason: undefined });
    expect(billingEventsFilterSchema.parse({ page: "2", pageSize: "50" })).toEqual({ page: 2, pageSize: 50 });
    expect(() => billingEventsFilterSchema.parse({ page: 0, pageSize: 101 })).toThrow();
  });
});

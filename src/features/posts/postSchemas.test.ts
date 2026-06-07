import { describe, expect, it } from "vitest";
import { postSchema } from "./postSchemas";

describe("post validation", () => {
  it("requires route, price type, and a three-letter currency", () => {
    expect(postSchema.safeParse({ currency: "EU", priceType: "REQUEST_QUOTE", routeId: "route_1" }).success).toBe(false);
    expect(postSchema.safeParse({ currency: "EUR", priceType: "REQUEST_QUOTE", routeId: "" }).success).toBe(false);
    expect(postSchema.safeParse({ currency: "eur", priceType: "REQUEST_QUOTE", routeId: "route_1" }).success).toBe(true);
  });

  it("turns empty optional numeric fields into undefined", () => {
    const parsed = postSchema.parse({ currency: "EUR", priceType: "REQUEST_QUOTE", routeId: "route_1", weightKg: "" });
    expect(parsed.weightKg).toBeUndefined();
  });

  it("requires a price amount for fixed or negotiable posts", () => {
    expect(postSchema.safeParse({ currency: "EUR", priceType: "FIXED", priceAmount: "", routeId: "route_1" }).success).toBe(false);
    expect(postSchema.safeParse({ currency: "EUR", priceType: "NEGOTIABLE", priceAmount: "250", routeId: "route_1" }).success).toBe(true);
    expect(postSchema.safeParse({ currency: "EUR", priceType: "REQUEST_QUOTE", priceAmount: "", routeId: "route_1" }).success).toBe(true);
  });
});

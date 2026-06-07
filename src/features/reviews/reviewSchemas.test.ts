import { describe, expect, it } from "vitest";
import { reviewCreateSchema, reviewStatusSchema, reviewUpdateSchema } from "./reviewSchemas";

describe("review schemas", () => {
  it("requires a completed-contract target and bounded rating", () => {
    expect(reviewCreateSchema.parse({ comment: "", contractId: "contract_123", rating: "5", status: "DRAFT" })).toEqual({
      comment: undefined,
      contractId: "contract_123",
      rating: 5,
      status: "DRAFT",
    });
    expect(() => reviewCreateSchema.parse({ contractId: "", rating: 6 })).toThrow();
  });

  it("validates updates and status transitions", () => {
    expect(reviewUpdateSchema.parse({ comment: "", rating: "3" })).toEqual({ comment: null, rating: 3 });
    expect(reviewStatusSchema.parse({ status: "PUBLISHED" })).toEqual({ status: "PUBLISHED" });
    expect(() => reviewStatusSchema.parse({ status: "ARCHIVED" })).toThrow();
  });
});

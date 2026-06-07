import { describe, expect, it } from "vitest";
import { companySchema } from "./companySchemas";

describe("company profile validation", () => {
  it("requires identity and location fields", () => {
    expect(companySchema.safeParse({ city: "", companyType: "BOTH", countryCode: "MK", name: "CA", registrationNumber: "REG" }).success).toBe(false);
    expect(companySchema.safeParse({ city: "Skopje", companyType: "BOTH", countryCode: "MKD", name: "CA", registrationNumber: "REG" }).success).toBe(false);
    expect(companySchema.safeParse({ city: "Skopje", companyType: "BOTH", countryCode: "MK", name: "Cargo Agent", registrationNumber: "REG-1" }).success).toBe(true);
  });

  it("validates optional URL fields when present", () => {
    expect(
      companySchema.safeParse({
        city: "Skopje",
        companyType: "SHIPPER",
        countryCode: "MK",
        name: "Cargo Agent",
        registrationNumber: "REG-1",
        website: "not-url",
      }).success,
    ).toBe(false);
  });
});

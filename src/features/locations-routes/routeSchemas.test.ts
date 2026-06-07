import { describe, expect, it } from "vitest";
import { inlineRouteSchema, locationSchema, routeSchema } from "./routeSchemas";

describe("location and route validation", () => {
  it("requires city and a two-letter country code", () => {
    expect(locationSchema.safeParse({ city: "", countryCode: "MK" }).success).toBe(false);
    expect(locationSchema.safeParse({ city: "Skopje", countryCode: "MK" }).success).toBe(true);
    expect(locationSchema.safeParse({ city: "Skopje", countryCode: "MKD" }).success).toBe(false);
  });

  it("prevents origin and destination from matching", () => {
    expect(routeSchema.safeParse({ destinationLocationId: "loc_1", originLocationId: "loc_1" }).success).toBe(false);
    expect(routeSchema.safeParse({ destinationLocationId: "loc_2", originLocationId: "loc_1" }).success).toBe(true);
  });

  it("validates inline route city and country requirements", () => {
    expect(
      inlineRouteSchema.safeParse({
        destinationCity: "Skopje",
        destinationCountryCode: "MK",
        originCity: "Skopje",
        originCountryCode: "MK",
      }).success,
    ).toBe(false);
    expect(
      inlineRouteSchema.safeParse({
        destinationCity: "Sofia",
        destinationCountryCode: "BG",
        originCity: "Skopje",
        originCountryCode: "MK",
      }).success,
    ).toBe(true);
    expect(
      inlineRouteSchema.safeParse({
        destinationCity: "Sofia",
        destinationCountryCode: "BGR",
        originCity: "Skopje",
        originCountryCode: "MK",
      }).success,
    ).toBe(false);
  });
});

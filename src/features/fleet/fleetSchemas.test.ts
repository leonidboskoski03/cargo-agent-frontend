import { describe, expect, it } from "vitest";
import { assignmentSchema, licenseSchema, vehicleSchema } from "./fleetSchemas";

describe("fleet schemas", () => {
  it("validates vehicle fields and normalizes country codes", () => {
    expect(vehicleSchema.safeParse({ countryOfRegistration: "M", plateNumber: "A", vehicleType: "TRUCK" }).success).toBe(false);

    const result = vehicleSchema.safeParse({
      capacityKg: "12000",
      countryOfRegistration: "mk",
      plateNumber: "SK-100",
      vehicleType: "TRUCK",
      volumeM3: "38.5",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.countryOfRegistration).toBe("MK");
      expect(result.data.capacityKg).toBe(12000);
    }
  });

  it("requires license expiry to be after issue date", () => {
    expect(licenseSchema.safeParse({ expiresAt: "2026-01-01", issuedAt: "2026-02-01", licenseType: "CE" }).success).toBe(false);
    expect(licenseSchema.safeParse({ expiresAt: "2027-01-01", issuedAt: "2026-02-01", licenseType: "CE" }).success).toBe(true);
  });

  it("requires assignment vehicle, driver, and valid time window", () => {
    expect(assignmentSchema.safeParse({ driverUserId: "", startsAt: "", vehicleId: "" }).success).toBe(false);
    expect(
      assignmentSchema.safeParse({
        driverUserId: "user_1",
        endsAt: "2026-01-01T08:00",
        startsAt: "2026-01-01T09:00",
        vehicleId: "vehicle_1",
      }).success,
    ).toBe(false);
    expect(
      assignmentSchema.safeParse({
        driverUserId: "user_1",
        endsAt: "2026-01-01T10:00",
        startsAt: "2026-01-01T09:00",
        vehicleId: "vehicle_1",
      }).success,
    ).toBe(true);
  });
});

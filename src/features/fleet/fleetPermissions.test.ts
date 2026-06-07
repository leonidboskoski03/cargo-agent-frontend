import { describe, expect, it } from "vitest";
import { canManageFleet, canViewFleet } from "./fleetPermissions";

describe("fleet permissions", () => {
  it("allows company users to view fleet", () => {
    expect(canViewFleet("COMPANY_ADMIN")).toBe(true);
    expect(canViewFleet("COMPANY_DRIVER")).toBe(true);
    expect(canViewFleet("JOB_SEEKER")).toBe(false);
  });

  it("allows only company admins to mutate fleet records", () => {
    expect(canManageFleet("COMPANY_ADMIN")).toBe(true);
    expect(canManageFleet("COMPANY_DRIVER")).toBe(false);
    expect(canManageFleet("JOB_SEEKER")).toBe(false);
  });
});

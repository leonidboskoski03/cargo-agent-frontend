import { describe, expect, it } from "vitest";
import { canManageBilling, canViewBilling } from "./billingPermissions";

describe("billing permissions", () => {
  it("limits billing mutations to company admins", () => {
    expect(canManageBilling("COMPANY_ADMIN")).toBe(true);
    expect(canManageBilling("COMPANY_DRIVER")).toBe(false);
  });

  it("lets company users view billing context", () => {
    expect(canViewBilling("COMPANY_ADMIN")).toBe(true);
    expect(canViewBilling("COMPANY_DRIVER")).toBe(true);
    expect(canViewBilling("JOB_SEEKER")).toBe(false);
  });
});

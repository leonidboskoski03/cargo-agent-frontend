import { describe, expect, it } from "vitest";
import { inviteSchema, membershipSchema, userProfileSchema } from "./teamSchemas";

describe("team validation", () => {
  it("validates invite recipient and company role", () => {
    expect(inviteSchema.safeParse({ invitedEmail: "bad", targetRole: "COMPANY_DRIVER" }).success).toBe(false);
    expect(inviteSchema.safeParse({ invitedEmail: "driver@cargo.test", targetRole: "JOB_SEEKER" }).success).toBe(false);
    expect(inviteSchema.safeParse({ invitedEmail: "driver@cargo.test", targetRole: "COMPANY_DRIVER" }).success).toBe(true);
  });

  it("validates user profile basics", () => {
    expect(userProfileSchema.safeParse({ firstName: "", lastName: "Driver", phone: "" }).success).toBe(false);
    expect(userProfileSchema.safeParse({ firstName: "Dana", lastName: "Driver", phone: "" }).success).toBe(true);
  });

  it("allows nullable company linkage in membership payload", () => {
    expect(membershipSchema.safeParse({ companyId: null, role: "JOB_SEEKER" }).success).toBe(true);
  });
});

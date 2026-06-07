import { describe, expect, it } from "vitest";
import { canChangeMembership, canCreateInvite, canDeleteTeamUser, canManageCompany, canManageTeam } from "./teamPermissions";

describe("team and company permissions", () => {
  it("allows only admins to manage company and team resources", () => {
    expect(canManageCompany("COMPANY_ADMIN")).toBe(true);
    expect(canManageTeam("COMPANY_ADMIN")).toBe(true);
    expect(canManageCompany("COMPANY_DRIVER")).toBe(false);
    expect(canCreateInvite("COMPANY_DRIVER")).toBe(false);
  });

  it("prevents self membership and self delete controls", () => {
    expect(canChangeMembership({ currentUserId: "u1", role: "COMPANY_ADMIN", targetUserId: "u2" })).toBe(true);
    expect(canChangeMembership({ currentUserId: "u1", role: "COMPANY_ADMIN", targetUserId: "u1" })).toBe(false);
    expect(canDeleteTeamUser({ currentUserId: "u1", role: "COMPANY_ADMIN", targetUserId: "u1" })).toBe(false);
  });
});

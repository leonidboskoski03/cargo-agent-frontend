import { describe, expect, it } from "vitest";
import { canDecideBid, canEditCompanyPost, canManageCompanyPosts, canManageOwnPendingBid } from "./postPermissions";

describe("post and bid role permissions", () => {
  it("keeps company drivers in view-only mode for company post management", () => {
    expect(canManageCompanyPosts("COMPANY_ADMIN")).toBe(true);
    expect(canManageCompanyPosts("COMPANY_DRIVER")).toBe(false);
    expect(canEditCompanyPost({ ownsPost: true, role: "COMPANY_DRIVER", status: "OPEN" })).toBe(false);
  });

  it("allows admins to edit their own open, draft, or archived company posts", () => {
    expect(canEditCompanyPost({ ownsPost: true, role: "COMPANY_ADMIN", status: "OPEN" })).toBe(true);
    expect(canEditCompanyPost({ ownsPost: true, role: "COMPANY_ADMIN", status: "DRAFT" })).toBe(true);
    expect(canEditCompanyPost({ ownsPost: true, role: "COMPANY_ADMIN", status: "ARCHIVED" })).toBe(true);
    expect(canEditCompanyPost({ ownsPost: true, role: "COMPANY_ADMIN", status: "CANCELLED" })).toBe(false);
    expect(canEditCompanyPost({ ownsPost: false, role: "COMPANY_ADMIN", status: "OPEN" })).toBe(false);
  });

  it("separates post-owner decisions from bid-owner actions", () => {
    expect(canDecideBid({ ownsPost: true, role: "COMPANY_ADMIN", status: "PENDING" })).toBe(true);
    expect(canDecideBid({ ownsPost: true, role: "COMPANY_DRIVER", status: "PENDING" })).toBe(false);
    expect(canManageOwnPendingBid({ ownsBid: true, status: "PENDING" })).toBe(true);
    expect(canManageOwnPendingBid({ ownsBid: true, status: "ACCEPTED" })).toBe(false);
  });
});

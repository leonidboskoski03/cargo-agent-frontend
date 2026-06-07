import { describe, expect, it } from "vitest";
import { canManageDocuments, canManageReviews, canViewAuditLogs } from "./supportPermissions";

describe("support permissions", () => {
  it("keeps document and review mutation helpers admin-only", () => {
    expect(canManageDocuments("COMPANY_ADMIN")).toBe(true);
    expect(canManageDocuments("COMPANY_DRIVER")).toBe(false);
    expect(canManageReviews("COMPANY_ADMIN")).toBe(true);
    expect(canManageReviews("COMPANY_DRIVER")).toBe(false);
  });

  it("keeps audit logs admin-only", () => {
    expect(canViewAuditLogs("COMPANY_ADMIN")).toBe(true);
    expect(canViewAuditLogs("COMPANY_DRIVER")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { auditFilterSchema, documentCreateSchema, notificationFilterSchema } from "./supportSchemas";

describe("support schemas", () => {
  it("validates notification filters", () => {
    expect(notificationFilterSchema.parse({ page: "2", pageSize: "10", unreadOnly: "true" })).toEqual({
      page: 2,
      pageSize: 10,
      unreadOnly: true,
    });
  });

  it("validates document metadata creation", () => {
    expect(documentCreateSchema.parse({
      kind: "INSURANCE",
      mimeType: "application/pdf",
      name: "Insurance policy",
      ownerCompanyId: "",
      ownerUserId: "",
      url: "https://example.com/policy.pdf",
    })).toMatchObject({
      kind: "INSURANCE",
      mimeType: "application/pdf",
      name: "Insurance policy",
      url: "https://example.com/policy.pdf",
    });
    expect(() => documentCreateSchema.parse({ kind: "OTHER", mimeType: "pdf", name: "", url: "not-a-url" })).toThrow();
  });

  it("normalizes audit filters", () => {
    expect(auditFilterSchema.parse({ action: " CONTRACT_CREATED ", actorId: "", page: 1, pageSize: 20 })).toEqual({
      action: "CONTRACT_CREATED",
      actorId: undefined,
      page: 1,
      pageSize: 20,
    });
  });
});

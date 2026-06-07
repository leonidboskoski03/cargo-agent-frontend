import { describe, expect, it } from "vitest";
import {
  canChangeContractStatus,
  canCreateContract,
  canDeleteContract,
  canRestoreContract,
  contractStatusTargets,
} from "./contractPermissions";

describe("contract permissions", () => {
  it("allows contract creation only for admin-owned assigned posts with accepted priced bids", () => {
    expect(
      canCreateContract({
        bidStatus: "ACCEPTED",
        hasOfferedPrice: true,
        ownsPost: true,
        postStatus: "ASSIGNED",
        role: "COMPANY_ADMIN",
      }),
    ).toBe(true);
    expect(
      canCreateContract({
        bidStatus: "ACCEPTED",
        hasOfferedPrice: true,
        ownsPost: true,
        postStatus: "ASSIGNED",
        role: "COMPANY_DRIVER",
      }),
    ).toBe(false);
    expect(
      canCreateContract({
        bidStatus: "PENDING",
        hasOfferedPrice: true,
        ownsPost: true,
        postStatus: "ASSIGNED",
        role: "COMPANY_ADMIN",
      }),
    ).toBe(false);
  });

  it("exposes only backend-supported status transitions", () => {
    expect(contractStatusTargets("CONFIRMED")).toEqual(["IN_PROGRESS", "CANCELLED", "DISPUTED"]);
    expect(contractStatusTargets("IN_PROGRESS")).toEqual(["COMPLETED", "CANCELLED", "DISPUTED"]);
    expect(contractStatusTargets("COMPLETED")).toEqual([]);
  });

  it("keeps drivers from mutating contracts", () => {
    expect(canChangeContractStatus({ isInvolved: true, role: "COMPANY_ADMIN", status: "CONFIRMED" })).toBe(true);
    expect(canChangeContractStatus({ isInvolved: true, role: "COMPANY_DRIVER", status: "CONFIRMED" })).toBe(false);
    expect(canDeleteContract({ isShipper: true, role: "COMPANY_DRIVER" })).toBe(false);
    expect(canRestoreContract({ isShipper: true, role: "COMPANY_ADMIN" })).toBe(true);
  });
});

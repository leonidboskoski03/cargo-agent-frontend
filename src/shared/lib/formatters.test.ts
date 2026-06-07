import { describe, expect, it } from "vitest";
import { humanizeEnum } from "./formatters";

describe("humanizeEnum", () => {
  it("turns backend enum values into readable labels", () => {
    expect(humanizeEnum("REQUEST_QUOTE")).toBe("Request Quote");
    expect(humanizeEnum("IN_PROGRESS")).toBe("In Progress");
    expect(humanizeEnum(null)).toBe("Not set");
  });
});

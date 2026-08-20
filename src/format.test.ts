import { describe, expect, test } from "vitest";
import { eur, eurK, levelName, monthYear } from "./format";

describe("eur", () => {
  test("formats thousands with € and k", () => {
    expect(eurK(52500)).toBe("€53k");
  });
  test("handles null", () => {
    expect(eur(null)).toBe("—");
  });
  test("formats absolute EUR", () => {
    expect(eur(52500)).toBe("€52,500");
  });
  test("formats month and year without the day", () => {
    expect(monthYear(2025, 10)).toBe("Oct 2025");
    expect(monthYear(null, null)).toBe("—");
  });
  test("maps IC, management, and product level codes to display names", () => {
    expect(levelName("IC-4")).toBe("Staff");
    expect(levelName("M1")).toBe("Team Lead");
    expect(levelName("P-5")).toBe("Senior Product Manager");
    expect(levelName("Other")).toBe("Other");
  });
});

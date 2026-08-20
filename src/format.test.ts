import { describe, expect, test } from "vitest";
import { eur, eurK, monthYear } from "./format";

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
});

import { describe, expect, test } from "vitest";
import { eur, eurK } from "./format";

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
});

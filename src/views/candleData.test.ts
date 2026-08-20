import { describe, expect, test } from "vitest";
import { buildCandleData, buildVolumeData, colorForYear } from "./candleData";
import { Posting } from "../data/types";

function p(over: Partial<Posting>): Posting {
  return {
    date: new Date(2025, 4, 1), year: 2025, month: 5, company: "A", role: "R",
    craft: "Backend", level: "IC-3", levelFamily: "IC", levelRank: 3,
    location: "BCN", modality: "Remote", currency: "EUR",
    lowEur: 40000, midEur: 50000, highEur: 60000, rsu: false, bonus: "", ...over,
  } as Posting;
}

describe("buildCandleData", () => {
  test("produces one row per month with per-year keys", () => {
    const { rows, years } = buildCandleData([
      p({ year: 2025, month: 5, midEur: 50000 }),
      p({ year: 2026, month: 5, midEur: 70000 }),
    ]);
    expect(years).toEqual([2025, 2026]);
    const may = rows.find((r) => r.month === 5)!;
    expect(may.monthLabel).toBe("May");
    expect(may["y2025_median"]).toBe(50000);
    expect(may["y2026_median"]).toBe(70000);
  });
  test("has 12 month rows regardless of coverage", () => {
    const { rows } = buildCandleData([p({})]);
    expect(rows).toHaveLength(12);
  });
});

describe("buildVolumeData", () => {
  test("counts per month per year", () => {
    const { rows } = buildVolumeData([p({ year: 2025, month: 5 }), p({ year: 2025, month: 5 })]);
    expect(rows.find((r) => r.month === 5)!["y2025"]).toBe(2);
  });
});

describe("colorForYear", () => {
  test("stable per year, differs across years", () => {
    expect(colorForYear(2025)).toBe(colorForYear(2025));
    expect(colorForYear(2025)).not.toBe(colorForYear(2026));
  });
});

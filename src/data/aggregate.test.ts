import { describe, expect, test } from "vitest";
import {
  percentiles, applyFilters, compByMonthYear, volumeByMonthYear,
  companyLeaderboard, topCompaniesForCraft, compBy, EMPTY_FILTERS,
} from "./aggregate";
import { Posting } from "./types";

function p(over: Partial<Posting>): Posting {
  return {
    date: new Date(2025, 4, 1), year: 2025, month: 5,
    company: "Acme", role: "Eng", craft: "Backend", level: "IC-3",
    levelFamily: "IC", levelRank: 3, location: "Barcelona",
    modality: "Remote", currency: "EUR",
    lowEur: 40000, midEur: 50000, highEur: 60000, rsu: false, bonus: "",
    ...over,
  } as Posting;
}

describe("percentiles", () => {
  test("median of 1..5 is 3", () => {
    expect(percentiles([5,1,3,2,4], [50])[0]).toBe(3);
  });
  test("p25/p75 interpolate", () => {
    const [p25, p75] = percentiles([1,2,3,4], [25, 75]);
    expect(p25).toBeCloseTo(1.75);
    expect(p75).toBeCloseTo(3.25);
  });
  test("empty returns NaN-free zeros-length", () => {
    expect(percentiles([], [50])).toEqual([0]);
  });
});

describe("applyFilters", () => {
  const data = [p({ company: "A", craft: "Backend" }), p({ company: "B", craft: "Data" })];
  test("no filters returns all", () => {
    expect(applyFilters(data, EMPTY_FILTERS)).toHaveLength(2);
  });
  test("craft filter", () => {
    const out = applyFilters(data, { ...EMPTY_FILTERS, crafts: ["Data"] });
    expect(out).toHaveLength(1);
    expect(out[0].company).toBe("B");
  });
  test("filters compose (AND)", () => {
    const out = applyFilters(data, { ...EMPTY_FILTERS, crafts: ["Backend"], companies: ["B"] });
    expect(out).toHaveLength(0);
  });
});

describe("compByMonthYear", () => {
  test("buckets by year+month with n", () => {
    const out = compByMonthYear([
      p({ year: 2025, month: 5, midEur: 40000, lowEur: 40000, highEur: 40000 }),
      p({ year: 2025, month: 5, midEur: 60000, lowEur: 60000, highEur: 60000 }),
      p({ year: 2026, month: 5, midEur: 50000, lowEur: 50000, highEur: 50000 }),
    ]);
    const cell = out.find((c) => c.year === 2025 && c.month === 5)!;
    expect(cell.n).toBe(2);
    expect(cell.median).toBe(50000);
    expect(out.find((c) => c.year === 2026)!.n).toBe(1);
  });
  test("ignores rows without mid or without date", () => {
    const out = compByMonthYear([p({ midEur: undefined }), p({ year: null, month: null })]);
    expect(out).toHaveLength(0);
  });
});

describe("volumeByMonthYear", () => {
  test("counts rows per month/year", () => {
    const out = volumeByMonthYear([p({}), p({}), p({ year: 2026 })]);
    expect(out.find((c) => c.year === 2025)!.count).toBe(2);
    expect(out.find((c) => c.year === 2026)!.count).toBe(1);
  });
});

describe("companyLeaderboard", () => {
  test("counts and sorts desc, lists crafts", () => {
    const out = companyLeaderboard([
      p({ company: "A", craft: "Backend" }),
      p({ company: "A", craft: "Data" }),
      p({ company: "B", craft: "Backend" }),
    ]);
    expect(out[0].company).toBe("A");
    expect(out[0].count).toBe(2);
    expect(out[0].crafts.sort()).toEqual(["Backend", "Data"]);
  });
});

describe("topCompaniesForCraft", () => {
  test("ranks companies within a craft", () => {
    const out = topCompaniesForCraft([
      p({ company: "A", craft: "Backend" }),
      p({ company: "A", craft: "Backend" }),
      p({ company: "B", craft: "Backend" }),
      p({ company: "C", craft: "Data" }),
    ], "Backend");
    expect(out[0]).toEqual({ company: "A", count: 2 });
    expect(out.find((r) => r.company === "C")).toBeUndefined();
  });
});

describe("compBy", () => {
  test("groups stats by dimension", () => {
    const out = compBy([
      p({ craft: "Backend", midEur: 50000 }),
      p({ craft: "Backend", midEur: 70000 }),
      p({ craft: "Data", midEur: 60000 }),
    ], "craft");
    const be = out.find((d) => d.key === "Backend")!;
    expect(be.n).toBe(2);
    expect(be.median).toBe(60000);
  });
});

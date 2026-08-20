import { describe, expect, test } from "vitest";
import {
  parseDate, normalizeModality, parseLevel, toEur, normalizeRows,
} from "./normalize";

describe("parseDate", () => {
  test("parses M/D/YYYY", () => {
    const d = parseDate("1/24/2024")!;
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(0); // Jan
    expect(d.getDate()).toBe(24);
  });
  test("parses YYYY-MM-DD", () => {
    const d = parseDate("2024-07-01")!;
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(6);
  });
  test("returns null on garbage", () => {
    expect(parseDate("not a date")).toBeNull();
    expect(parseDate("")).toBeNull();
  });
});

describe("normalizeModality", () => {
  test("merges Full Remote and Remote", () => {
    expect(normalizeModality("Full Remote")).toBe("Remote");
    expect(normalizeModality("Remote")).toBe("Remote");
  });
  test("keeps In Office and Hybrid", () => {
    expect(normalizeModality("In Office")).toBe("In Office");
    expect(normalizeModality("Hybrid")).toBe("Hybrid");
  });
  test("unknown maps to Unknown", () => {
    expect(normalizeModality("N/A")).toBe("Unknown");
    expect(normalizeModality("")).toBe("Unknown");
  });
});

describe("parseLevel", () => {
  test("fixes M1 to M-1 and marks Manager", () => {
    const r = parseLevel("M1");
    expect(r.label).toBe("M-1");
    expect(r.family).toBe("Manager");
    expect(r.rank).toBe(1);
  });
  test("IC family and rank", () => {
    expect(parseLevel("IC-3")).toEqual({ family: "IC", rank: 3, label: "IC-3" });
  });
  test("Product family", () => {
    expect(parseLevel("P-5").family).toBe("Product");
  });
  test("unknown is Other", () => {
    expect(parseLevel("Other").family).toBe("Other");
  });
});

describe("toEur", () => {
  test("EUR unchanged", () => { expect(toEur(50, "EUR")).toBe(50); });
  test("USD converted", () => { expect(toEur(100, "USD")).toBeCloseTo(92); });
  test("GBP converted", () => { expect(toEur(100, "GBP")).toBeCloseTo(117); });
});

describe("normalizeRows", () => {
  const header = ["Date","Company","Role","Craft","Level","Location","Modality","Currency","Low end","Mid","High end","RSU","Bonus"];
  const avg = ["", "", "", "", "", "", "", "AVG", "44.1", "51.5", "59.0"];
  const row = ["1/24/2024","Flanks","Senior Full-stack Engineer","Full-stack","IC-3","Barcelona","In Office","EUR","  50 ","  52.5 ","  55 ","","" ];

  test("skips AVG row and header, parses a data row", () => {
    const out = normalizeRows([avg, header, row]);
    expect(out).toHaveLength(1);
    const p = out[0];
    expect(p.company).toBe("Flanks");
    expect(p.craft).toBe("Full-stack");
    expect(p.year).toBe(2024);
    expect(p.month).toBe(1);
    // 52.5k EUR -> 52500 absolute
    expect(p.midEur).toBe(52500);
    expect(p.lowEur).toBe(50000);
    expect(p.highEur).toBe(55000);
  });

  test("drops fully empty rows", () => {
    const out = normalizeRows([header, ["","","","","","","","","","",""], row]);
    expect(out).toHaveLength(1);
  });

  test("mid falls back to (low+high)/2 when blank", () => {
    const r2 = ["1/24/2024","X","R","Backend","IC-2","Remote","Full Remote","EUR","40","","60"];
    const out = normalizeRows([header, r2]);
    expect(out[0].midEur).toBe(50000);
    expect(out[0].modality).toBe("Remote");
  });

  test("converts USD rows to EUR", () => {
    const r3 = ["1/24/2024","Y","R","Data","IC-4","Remote","Remote","USD","100","100","100"];
    const out = normalizeRows([header, r3]);
    expect(out[0].midEur).toBeCloseTo(92000);
    expect(out[0].currency).toBe("USD");
  });
});

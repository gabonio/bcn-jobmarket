# BCN Tech Job Market Explorer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A client-side React app that reads a Google Sheet of Barcelona tech job postings and provides interactive filtering, a month/year compensation-candle + volume chart, a company leaderboard, and compensation analytics.

**Architecture:** Live CSV fetch from the Google `gviz` endpoint (bundled snapshot fallback) → a tested pure normalization layer → tested pure aggregation functions → a thin React UI with a global filter context. No backend; ~1,266 rows held in memory.

**Tech Stack:** Vite, React 18, TypeScript, Recharts, PapaParse, Vitest.

## Global Constraints

- All data work goes through pure functions in `src/data/`; React components never parse or aggregate inline.
- Salary values in the sheet are in **thousands** of the row's currency; stored internally as **absolute EUR** (× 1000, FX-converted).
- FX constant, in one place: `FX = { USD: 0.92, GBP: 1.17, EUR: 1 }`.
- Modality `Full Remote` and `Remote` are the **same** category → `Remote`.
- Skip the stray `AVG` row (row 1); the header is row 2.
- Time views bucket by month and MUST be labeled as collection cadence, not live posting flow.
- Comp stats suppress/badge when sample size `n < 3`.
- Sheet: ID `1GIOcNdlraQDV-qD45deFCRNfPDVIkELE5RGAeq7gQPA`, gid `1472483134`.
- Non-Barcelona rows (Madrid, Valencia, remote-only, etc.) are kept and filterable.
- Every task ends `npm test` green and a commit.

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`
- Test: `src/smoke.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: a working Vite+React+TS+Vitest project; `npm run dev`, `npm test`, `npm run build` all work.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "bcn-jobmarket",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "recharts": "^2.12.7",
    "papaparse": "^5.4.1"
  },
  "devDependencies": {
    "@types/papaparse": "^5.3.14",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.3",
    "vite": "^5.3.4",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src"]
}
```

`vite.config.ts`:
```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({ plugins: [react()] });
```

`index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BCN Tech Job Market</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/vite-env.d.ts`:
```ts
/// <reference types="vite/client" />
```

- [ ] **Step 3: Create minimal app + smoke test**

`src/App.tsx`:
```tsx
export default function App() {
  return <h1>BCN Tech Job Market</h1>;
}
```

`src/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

`src/smoke.test.ts`:
```ts
import { expect, test } from "vitest";
test("arithmetic sanity", () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Install and verify**

Run: `npm install && npm test && npm run build`
Expected: install succeeds, 1 test passes, build produces `dist/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite+React+TS+Vitest project"
```

---

### Task 2: Domain types and normalization

**Files:**
- Create: `src/data/types.ts`, `src/data/normalize.ts`
- Test: `src/data/normalize.test.ts`

**Interfaces:**
- Consumes: nothing (operates on raw string cell arrays from PapaParse).
- Produces:
  - `type RawRow = string[]`
  - `type Posting = { date: Date | null; year: number | null; month: number | null; company: string; role: string; craft: string; level: string; levelFamily: LevelFamily; levelRank: number | null; location: string; modality: Modality; currency: string; lowEur?: number; midEur?: number; highEur?: number; origLow?: number; origMid?: number; origHigh?: number; rsu: boolean; bonus: string; }`
  - `type Modality = "In Office" | "Hybrid" | "Remote" | "Unknown"`
  - `type LevelFamily = "IC" | "Manager" | "Product" | "Other"`
  - `FX: Record<string, number>`
  - `parseDate(s: string): Date | null`
  - `normalizeModality(s: string): Modality`
  - `parseLevel(s: string): { family: LevelFamily; rank: number | null; label: string }`
  - `toEur(value: number, currency: string): number`
  - `normalizeRows(rows: RawRow[]): Posting[]`

- [ ] **Step 1: Write `src/data/types.ts`**

```ts
export type RawRow = string[];

export type Modality = "In Office" | "Hybrid" | "Remote" | "Unknown";
export type LevelFamily = "IC" | "Manager" | "Product" | "Other";

export const FX: Record<string, number> = { USD: 0.92, GBP: 1.17, EUR: 1 };

export interface Posting {
  date: Date | null;
  year: number | null;
  month: number | null; // 1-12
  company: string;
  role: string;
  craft: string;
  level: string;
  levelFamily: LevelFamily;
  levelRank: number | null;
  location: string;
  modality: Modality;
  currency: string; // original, normalized code (EUR/USD/GBP)
  lowEur?: number;
  midEur?: number;
  highEur?: number;
  origLow?: number;
  origMid?: number;
  origHigh?: number;
  rsu: boolean;
  bonus: string;
}
```

- [ ] **Step 2: Write the failing tests**

`src/data/normalize.test.ts`:
```ts
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
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- normalize`
Expected: FAIL (module `./normalize` not found / functions undefined).

- [ ] **Step 4: Implement `src/data/normalize.ts`**

```ts
import { FX, LevelFamily, Modality, Posting, RawRow } from "./types";

export function parseDate(s: string): Date | null {
  const t = (s ?? "").trim();
  if (!t) return null;
  let m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (m) {
    const d = new Date(+m[3], +m[1] - 1, +m[2]);
    return isNaN(d.getTime()) ? null : d;
  }
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function normalizeModality(s: string): Modality {
  const t = (s ?? "").trim().toLowerCase();
  if (t === "in office") return "In Office";
  if (t === "hybrid") return "Hybrid";
  if (t === "remote" || t === "full remote") return "Remote";
  return "Unknown";
}

export function parseLevel(s: string): { family: LevelFamily; rank: number | null; label: string } {
  const t = (s ?? "").trim();
  const m = /^([A-Za-z]+)-?\s*(\d+)$/.exec(t);
  if (!m) return { family: "Other", rank: null, label: t || "Other" };
  const prefix = m[1].toUpperCase();
  const rank = +m[2];
  const label = `${prefix}-${rank}`;
  const family: LevelFamily =
    prefix === "IC" ? "IC" : prefix === "M" ? "Manager" : prefix === "P" ? "Product" : "Other";
  return { family, rank, label };
}

export function normalizeCurrency(s: string): string {
  const t = (s ?? "").trim().toUpperCase();
  if (t === "BP") return "GBP";
  if (t === "USD" || t === "EUR" || t === "GBP") return t;
  return "EUR";
}

export function toEur(value: number, currency: string): number {
  const rate = FX[normalizeCurrency(currency)] ?? 1;
  return value * rate;
}

function num(s: string): number | undefined {
  const t = (s ?? "").replace(/[^\d.,-]/g, "").replace(",", ".").trim();
  if (!t) return undefined;
  const n = parseFloat(t);
  return isNaN(n) ? undefined : n;
}

const HEADER_SENTINEL = "date";

export function normalizeRows(rows: RawRow[]): Posting[] {
  const out: Posting[] = [];
  for (const r of rows) {
    const c = (i: number) => (r[i] ?? "").trim();
    if (r.every((x) => !(x ?? "").trim())) continue;      // empty
    if (c(0).toLowerCase() === HEADER_SENTINEL) continue; // header
    if (!c(0) && !c(1) && c(7).toUpperCase() === "AVG") continue; // stray AVG
    if (!c(1)) continue;                                  // no company => not a data row

    const cur = normalizeCurrency(c(7));
    const low = num(c(8));
    const midRaw = num(c(9));
    const high = num(c(10));
    const mid = midRaw ?? (low != null && high != null ? (low + high) / 2 : undefined);
    const k = (v?: number) => (v == null ? undefined : Math.round(toEur(v, cur) * 1000));

    const d = parseDate(c(0));
    const lvl = parseLevel(c(4));
    out.push({
      date: d,
      year: d ? d.getFullYear() : null,
      month: d ? d.getMonth() + 1 : null,
      company: c(1),
      role: c(2),
      craft: c(3) || "N/A",
      level: lvl.label,
      levelFamily: lvl.family,
      levelRank: lvl.rank,
      location: c(5) || "N/A",
      modality: normalizeModality(c(6)),
      currency: cur,
      lowEur: k(low),
      midEur: k(mid),
      highEur: k(high),
      origLow: low,
      origMid: midRaw,
      origHigh: high,
      rsu: /yes/i.test(c(11)),
      bonus: c(12),
    });
  }
  return out;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- normalize`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add src/data/types.ts src/data/normalize.ts src/data/normalize.test.ts
git commit -m "feat: domain types and tested normalization layer"
```

---

### Task 3: Aggregation functions

**Files:**
- Create: `src/data/aggregate.ts`
- Test: `src/data/aggregate.test.ts`

**Interfaces:**
- Consumes: `Posting`, `Modality`, `LevelFamily` from Task 2.
- Produces:
  - `type Filters = { companies: string[]; crafts: string[]; levels: string[]; levelFamilies: string[]; modalities: string[]; locations: string[]; currencies: string[] }`
  - `EMPTY_FILTERS: Filters`
  - `applyFilters(postings: Posting[], f: Filters): Posting[]`
  - `percentiles(values: number[], ps: number[]): number[]`
  - `type MonthComp = { year: number; month: number; low: number; p25: number; median: number; p75: number; high: number; n: number }`
  - `compByMonthYear(postings: Posting[]): MonthComp[]`
  - `type MonthVol = { year: number; month: number; count: number }`
  - `volumeByMonthYear(postings: Posting[]): MonthVol[]`
  - `type CompanyStat = { company: string; count: number; crafts: string[]; medianComp: number | null }`
  - `companyLeaderboard(postings: Posting[]): CompanyStat[]`
  - `topCompaniesForCraft(postings: Posting[], craft: string): { company: string; count: number }[]`
  - `type DimStat = { key: string; low: number; p25: number; median: number; p75: number; high: number; n: number }`
  - `compBy(postings: Posting[], dim: "craft" | "levelFamily" | "modality"): DimStat[]`
  - `MIN_N = 3`
  - `distinct<T>(postings: Posting[], key: (p: Posting) => T): T[]`

- [ ] **Step 1: Write the failing tests**

`src/data/aggregate.test.ts`:
```ts
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- aggregate`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `src/data/aggregate.ts`**

```ts
import { Posting } from "./types";

export const MIN_N = 3;

export interface Filters {
  companies: string[];
  crafts: string[];
  levels: string[];
  levelFamilies: string[];
  modalities: string[];
  locations: string[];
  currencies: string[];
}

export const EMPTY_FILTERS: Filters = {
  companies: [], crafts: [], levels: [], levelFamilies: [],
  modalities: [], locations: [], currencies: [],
};

export function applyFilters(postings: Posting[], f: Filters): Posting[] {
  const has = (arr: string[], v: string) => arr.length === 0 || arr.includes(v);
  return postings.filter((p) =>
    has(f.companies, p.company) &&
    has(f.crafts, p.craft) &&
    has(f.levels, p.level) &&
    has(f.levelFamilies, p.levelFamily) &&
    has(f.modalities, p.modality) &&
    has(f.locations, p.location) &&
    has(f.currencies, p.currency)
  );
}

export function percentiles(values: number[], ps: number[]): number[] {
  if (values.length === 0) return ps.map(() => 0);
  const s = [...values].sort((a, b) => a - b);
  return ps.map((pct) => {
    const idx = (pct / 100) * (s.length - 1);
    const lo = Math.floor(idx), hi = Math.ceil(idx);
    if (lo === hi) return s[lo];
    return s[lo] + (s[hi] - s[lo]) * (idx - lo);
  });
}

export function distinct<T>(postings: Posting[], key: (p: Posting) => T): T[] {
  return [...new Set(postings.map(key))].filter((v) => v != null && v !== "") as T[];
}

export interface MonthComp {
  year: number; month: number;
  low: number; p25: number; median: number; p75: number; high: number; n: number;
}

export function compByMonthYear(postings: Posting[]): MonthComp[] {
  const groups = new Map<string, Posting[]>();
  for (const p of postings) {
    if (p.year == null || p.month == null || p.midEur == null) continue;
    const key = `${p.year}-${p.month}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
  }
  const out: MonthComp[] = [];
  for (const [key, ps] of groups) {
    const [year, month] = key.split("-").map(Number);
    const mids = ps.map((p) => p.midEur!).filter((v) => v != null);
    const lows = ps.map((p) => p.lowEur ?? p.midEur!);
    const highs = ps.map((p) => p.highEur ?? p.midEur!);
    const [p25, median, p75] = percentiles(mids, [25, 50, 75]);
    out.push({
      year, month, p25, median, p75,
      low: Math.min(...lows), high: Math.max(...highs), n: ps.length,
    });
  }
  return out.sort((a, b) => a.year - b.year || a.month - b.month);
}

export interface MonthVol { year: number; month: number; count: number; }

export function volumeByMonthYear(postings: Posting[]): MonthVol[] {
  const groups = new Map<string, number>();
  for (const p of postings) {
    if (p.year == null || p.month == null) continue;
    const key = `${p.year}-${p.month}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  return [...groups.entries()]
    .map(([key, count]) => {
      const [year, month] = key.split("-").map(Number);
      return { year, month, count };
    })
    .sort((a, b) => a.year - b.year || a.month - b.month);
}

export interface CompanyStat {
  company: string; count: number; crafts: string[]; medianComp: number | null;
}

export function companyLeaderboard(postings: Posting[]): CompanyStat[] {
  const groups = new Map<string, Posting[]>();
  for (const p of postings) {
    (groups.get(p.company) ?? groups.set(p.company, []).get(p.company)!).push(p);
  }
  const out: CompanyStat[] = [];
  for (const [company, ps] of groups) {
    const mids = ps.map((p) => p.midEur).filter((v): v is number => v != null);
    out.push({
      company,
      count: ps.length,
      crafts: [...new Set(ps.map((p) => p.craft))],
      medianComp: mids.length ? percentiles(mids, [50])[0] : null,
    });
  }
  return out.sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));
}

export function topCompaniesForCraft(postings: Posting[], craft: string): { company: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of postings) {
    if (p.craft !== craft) continue;
    counts.set(p.company, (counts.get(p.company) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));
}

export interface DimStat {
  key: string; low: number; p25: number; median: number; p75: number; high: number; n: number;
}

export function compBy(postings: Posting[], dim: "craft" | "levelFamily" | "modality"): DimStat[] {
  const groups = new Map<string, Posting[]>();
  for (const p of postings) {
    if (p.midEur == null) continue;
    const key = String(p[dim]);
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(p);
  }
  const out: DimStat[] = [];
  for (const [key, ps] of groups) {
    const mids = ps.map((p) => p.midEur!);
    const [p25, median, p75] = percentiles(mids, [25, 50, 75]);
    out.push({
      key, p25, median, p75,
      low: Math.min(...ps.map((p) => p.lowEur ?? p.midEur!)),
      high: Math.max(...ps.map((p) => p.highEur ?? p.midEur!)),
      n: ps.length,
    });
  }
  return out.sort((a, b) => b.median - a.median);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- aggregate`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/aggregate.ts src/data/aggregate.test.ts
git commit -m "feat: tested aggregation functions"
```

---

### Task 4: Data loading (live fetch + snapshot fallback)

**Files:**
- Create: `src/data/load.ts`, `src/data/snapshot.ts`
- Test: `src/data/load.test.ts`

**Interfaces:**
- Consumes: `normalizeRows` (Task 2).
- Produces:
  - `SHEET_CSV_URL: string`
  - `parseCsv(text: string): string[][]`
  - `type LoadResult = { postings: Posting[]; source: "live" | "cache"; error?: string }`
  - `loadPostings(fetcher?: typeof fetch): Promise<LoadResult>`

- [ ] **Step 1: Create the snapshot module**

Generate the snapshot from the real sheet, then embed it. Run this once to fetch:

```bash
curl -sL "https://docs.google.com/spreadsheets/d/1GIOcNdlraQDV-qD45deFCRNfPDVIkELE5RGAeq7gQPA/gviz/tq?tqx=out:csv&gid=1472483134" -o src/data/snapshot.csv
```

Then create `src/data/snapshot.ts` importing it as a raw string:
```ts
// Vite supports the ?raw suffix to import file contents as a string.
import csv from "./snapshot.csv?raw";
export const SNAPSHOT_CSV: string = csv;
export const SNAPSHOT_DATE = "2026-08-20";
```

Add to `src/vite-env.d.ts`:
```ts
declare module "*.csv?raw" { const content: string; export default content; }
```

- [ ] **Step 2: Write the failing tests**

`src/data/load.test.ts`:
```ts
import { describe, expect, test, vi } from "vitest";
import { parseCsv, loadPostings } from "./load";

describe("parseCsv", () => {
  test("parses quoted fields and commas", () => {
    const rows = parseCsv('a,b\n"x,y",z\n');
    expect(rows[0]).toEqual(["a", "b"]);
    expect(rows[1]).toEqual(["x,y", "z"]);
  });
});

describe("loadPostings", () => {
  const csv =
    'Date,Company,Role,Craft,Level,Location,Modality,Currency,Low end,Mid,High end\n' +
    '1/24/2024,Flanks,Eng,Backend,IC-3,Barcelona,In Office,EUR,50,52.5,55\n';

  test("uses live data when fetch succeeds", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(csv) });
    const res = await loadPostings(fakeFetch as unknown as typeof fetch);
    expect(res.source).toBe("live");
    expect(res.postings).toHaveLength(1);
    expect(res.postings[0].company).toBe("Flanks");
  });

  test("falls back to cache when fetch throws", async () => {
    const fakeFetch = vi.fn().mockRejectedValue(new Error("network"));
    const res = await loadPostings(fakeFetch as unknown as typeof fetch);
    expect(res.source).toBe("cache");
    expect(res.postings.length).toBeGreaterThan(0);
  });

  test("falls back to cache on non-ok response", async () => {
    const fakeFetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("") });
    const res = await loadPostings(fakeFetch as unknown as typeof fetch);
    expect(res.source).toBe("cache");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- load`
Expected: FAIL (module not found).

- [ ] **Step 4: Implement `src/data/load.ts`**

```ts
import Papa from "papaparse";
import { normalizeRows } from "./normalize";
import { Posting } from "./types";
import { SNAPSHOT_CSV } from "./snapshot";

const SHEET_ID = "1GIOcNdlraQDV-qD45deFCRNfPDVIkELE5RGAeq7gQPA";
const GID = "1472483134";
export const SHEET_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${GID}`;

export function parseCsv(text: string): string[][] {
  return Papa.parse<string[]>(text, { skipEmptyLines: false }).data;
}

export interface LoadResult {
  postings: Posting[];
  source: "live" | "cache";
  error?: string;
}

export async function loadPostings(fetcher: typeof fetch = fetch): Promise<LoadResult> {
  try {
    const resp = await fetcher(SHEET_CSV_URL);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const text = await resp.text();
    const postings = normalizeRows(parseCsv(text));
    if (postings.length === 0) throw new Error("empty live data");
    return { postings, source: "live" };
  } catch (e) {
    return {
      postings: normalizeRows(parseCsv(SNAPSHOT_CSV)),
      source: "cache",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test -- load`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/data/load.ts src/data/snapshot.ts src/data/snapshot.csv src/vite-env.d.ts src/data/load.test.ts
git commit -m "feat: live gviz loader with snapshot fallback"
```

---

### Task 5: App shell, data hook, and global filter bar

**Files:**
- Create: `src/state/useData.ts`, `src/components/FilterBar.tsx`, `src/components/MultiSelect.tsx`, `src/styles.css`
- Modify: `src/App.tsx`, `src/main.tsx`
- Test: `src/state/useData.test.ts` (logic helper only)

**Interfaces:**
- Consumes: `loadPostings`, `LoadResult` (Task 4); `Filters`, `EMPTY_FILTERS`, `applyFilters`, `distinct` (Task 3).
- Produces:
  - `filterOptions(postings: Posting[]): { companies: string[]; crafts: string[]; levels: string[]; levelFamilies: string[]; modalities: string[]; locations: string[]; currencies: string[] }`
  - `useData(): { loading: boolean; result: LoadResult | null }`
  - `FilterBar` component: props `{ postings: Posting[]; filters: Filters; onChange: (f: Filters) => void }`
  - Tab navigation shell in `App.tsx` with tabs: Overview, Comp & Volume, Companies, Roles & Crafts, Compensation.

- [ ] **Step 1: Write failing test for `filterOptions`**

`src/state/useData.test.ts`:
```ts
import { describe, expect, test } from "vitest";
import { filterOptions } from "./useData";
import { Posting } from "../data/types";

function p(over: Partial<Posting>): Posting {
  return {
    date: null, year: null, month: null, company: "A", role: "R", craft: "Backend",
    level: "IC-3", levelFamily: "IC", levelRank: 3, location: "Barcelona",
    modality: "Remote", currency: "EUR", rsu: false, bonus: "", ...over,
  } as Posting;
}

describe("filterOptions", () => {
  test("returns sorted distinct values per field", () => {
    const opts = filterOptions([p({ company: "B" }), p({ company: "A" }), p({ craft: "Data" })]);
    expect(opts.companies).toEqual(["A", "B"]);
    expect(opts.crafts.sort()).toEqual(["Backend", "Data"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useData`
Expected: FAIL.

- [ ] **Step 3: Implement `src/state/useData.ts`**

```ts
import { useEffect, useState } from "react";
import { loadPostings, LoadResult } from "../data/load";
import { Posting } from "../data/types";
import { distinct } from "../data/aggregate";

export function filterOptions(postings: Posting[]) {
  const s = (arr: string[]) => [...arr].sort((a, b) => a.localeCompare(b));
  return {
    companies: s(distinct(postings, (p) => p.company)),
    crafts: s(distinct(postings, (p) => p.craft)),
    levels: s(distinct(postings, (p) => p.level)),
    levelFamilies: s(distinct(postings, (p) => p.levelFamily)),
    modalities: s(distinct(postings, (p) => p.modality)),
    locations: s(distinct(postings, (p) => p.location)),
    currencies: s(distinct(postings, (p) => p.currency)),
  };
}

export function useData(): { loading: boolean; result: LoadResult | null } {
  const [result, setResult] = useState<LoadResult | null>(null);
  useEffect(() => {
    let alive = true;
    loadPostings().then((r) => alive && setResult(r));
    return () => { alive = false; };
  }, []);
  return { loading: result === null, result };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useData`
Expected: PASS.

- [ ] **Step 5: Implement `MultiSelect` and `FilterBar` (no test — thin UI)**

`src/components/MultiSelect.tsx`:
```tsx
interface Props { label: string; options: string[]; selected: string[]; onChange: (v: string[]) => void; }

export function MultiSelect({ label, options, selected, onChange }: Props) {
  return (
    <label className="filter">
      <span>{label}{selected.length ? ` (${selected.length})` : ""}</span>
      <select
        multiple
        value={selected}
        onChange={(e) =>
          onChange(Array.from(e.target.selectedOptions, (o) => o.value))
        }
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
```

`src/components/FilterBar.tsx`:
```tsx
import { Posting } from "../data/types";
import { Filters, EMPTY_FILTERS } from "../data/aggregate";
import { filterOptions } from "../state/useData";
import { MultiSelect } from "./MultiSelect";

interface Props { postings: Posting[]; filters: Filters; onChange: (f: Filters) => void; }

export function FilterBar({ postings, filters, onChange }: Props) {
  const opts = filterOptions(postings);
  const set = (k: keyof Filters, v: string[]) => onChange({ ...filters, [k]: v });
  return (
    <div className="filterbar">
      <MultiSelect label="Company" options={opts.companies} selected={filters.companies} onChange={(v) => set("companies", v)} />
      <MultiSelect label="Craft" options={opts.crafts} selected={filters.crafts} onChange={(v) => set("crafts", v)} />
      <MultiSelect label="Level" options={opts.levels} selected={filters.levels} onChange={(v) => set("levels", v)} />
      <MultiSelect label="Modality" options={opts.modalities} selected={filters.modalities} onChange={(v) => set("modalities", v)} />
      <MultiSelect label="Location" options={opts.locations} selected={filters.locations} onChange={(v) => set("locations", v)} />
      <MultiSelect label="Currency" options={opts.currencies} selected={filters.currencies} onChange={(v) => set("currencies", v)} />
      <button onClick={() => onChange(EMPTY_FILTERS)}>Clear all</button>
    </div>
  );
}
```

- [ ] **Step 6: Rewrite `src/App.tsx` with tabs, data loading, filter state**

```tsx
import { useMemo, useState } from "react";
import "./styles.css";
import { useData } from "./state/useData";
import { FilterBar } from "./components/FilterBar";
import { Filters, EMPTY_FILTERS, applyFilters } from "./data/aggregate";
import { Overview } from "./views/Overview";
import { CompVolume } from "./views/CompVolume";
import { Companies } from "./views/Companies";
import { RolesCrafts } from "./views/RolesCrafts";
import { Compensation } from "./views/Compensation";

const TABS = ["Overview", "Comp & Volume", "Companies", "Roles & Crafts", "Compensation"] as const;
type Tab = typeof TABS[number];

export default function App() {
  const { loading, result } = useData();
  const [tab, setTab] = useState<Tab>("Comp & Volume");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const all = result?.postings ?? [];
  const filtered = useMemo(() => applyFilters(all, filters), [all, filters]);

  if (loading) return <div className="loading">Loading job market data…</div>;

  return (
    <div className="app">
      <header>
        <h1>BCN Tech Job Market</h1>
        {result?.source === "cache" && (
          <div className="banner">Showing cached data (live fetch failed: {result.error})</div>
        )}
        <nav>{TABS.map((t) => (
          <button key={t} className={t === tab ? "active" : ""} onClick={() => setTab(t)}>{t}</button>
        ))}</nav>
      </header>
      <FilterBar postings={all} filters={filters} onChange={setFilters} />
      <p className="muted">{filtered.length} of {all.length} postings match ·
        time axes reflect the sheet's monthly snapshot cadence, not live posting flow.</p>
      <main>
        {tab === "Overview" && <Overview postings={filtered} />}
        {tab === "Comp & Volume" && <CompVolume postings={filtered} />}
        {tab === "Companies" && <Companies postings={filtered} />}
        {tab === "Roles & Crafts" && <RolesCrafts postings={filtered} />}
        {tab === "Compensation" && <Compensation postings={filtered} />}
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Create `src/styles.css`**

```css
* { box-sizing: border-box; }
body { margin: 0; font-family: system-ui, sans-serif; color: #1a1a2e; background: #f7f8fa; }
.app { max-width: 1100px; margin: 0 auto; padding: 16px; }
.loading { padding: 40px; text-align: center; }
header h1 { margin: 0 0 8px; }
nav button { margin-right: 6px; padding: 8px 12px; border: 1px solid #ccc; background: #fff; border-radius: 6px; cursor: pointer; }
nav button.active { background: #1a1a2e; color: #fff; }
.banner { background: #fff3cd; border: 1px solid #ffe69c; padding: 6px 10px; border-radius: 6px; margin: 6px 0; }
.filterbar { display: flex; flex-wrap: wrap; gap: 10px; margin: 12px 0; align-items: flex-end; }
.filter { display: flex; flex-direction: column; font-size: 12px; }
.filter select { min-width: 140px; height: 90px; }
.muted { color: #667; font-size: 13px; }
.kpis { display: flex; flex-wrap: wrap; gap: 12px; }
.kpi { background: #fff; border: 1px solid #e3e6ea; border-radius: 8px; padding: 12px 16px; min-width: 130px; }
.kpi .value { font-size: 24px; font-weight: 700; }
.kpi .label { font-size: 12px; color: #667; }
table { width: 100%; border-collapse: collapse; background: #fff; }
th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 13px; }
th { cursor: pointer; }
.card { background: #fff; border: 1px solid #e3e6ea; border-radius: 8px; padding: 12px; margin: 12px 0; }
```

- [ ] **Step 8: Create placeholder view files so the app compiles**

Create each of these with a stub that will be filled by later tasks:
`src/views/Overview.tsx`, `src/views/CompVolume.tsx`, `src/views/Companies.tsx`, `src/views/RolesCrafts.tsx`, `src/views/Compensation.tsx`, each:
```tsx
import { Posting } from "../data/types";
export function Overview({ postings }: { postings: Posting[] }) {
  return <div className="card">Overview — {postings.length} postings</div>;
}
```
(Rename the function/label per file: `CompVolume`, `Companies`, `RolesCrafts`, `Compensation`.)

- [ ] **Step 9: Verify build + tests**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: app shell, data hook, global filter bar"
```

---

### Task 6: Overview view

**Files:**
- Modify: `src/views/Overview.tsx`
- Create: `src/format.ts`
- Test: `src/format.test.ts`

**Interfaces:**
- Consumes: `Posting` (Task 2); `companyLeaderboard`, `compBy`, `percentiles`, `distinct` (Task 3).
- Produces: `eur(n: number | null | undefined): string`, `eurK(n: number): string`.

- [ ] **Step 1: Write failing test for formatter**

`src/format.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- format`
Expected: FAIL.

- [ ] **Step 3: Implement `src/format.ts`**

```ts
export function eur(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "€" + Math.round(n).toLocaleString("en-US");
}
export function eurK(n: number | null | undefined): string {
  if (n == null || isNaN(n)) return "—";
  return "€" + Math.round(n / 1000) + "k";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- format`
Expected: PASS.

- [ ] **Step 5: Implement `src/views/Overview.tsx`**

```tsx
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting } from "../data/types";
import { companyLeaderboard, compBy, distinct, percentiles } from "../data/aggregate";
import { eurK } from "../format";

export function Overview({ postings }: { postings: Posting[] }) {
  const companies = distinct(postings, (p) => p.company).length;
  const crafts = distinct(postings, (p) => p.craft).length;
  const mids = postings.map((p) => p.midEur).filter((v): v is number => v != null);
  const medianComp = mids.length ? percentiles(mids, [50])[0] : null;
  const craftMix = compBy(postings, "craft")
    .map((d) => ({ craft: d.key, count: d.n }))
    .sort((a, b) => b.count - a.count);
  const modalityMix = Object.entries(
    postings.reduce<Record<string, number>>((a, p) => ({ ...a, [p.modality]: (a[p.modality] ?? 0) + 1 }), {})
  ).map(([modality, count]) => ({ modality, count }));

  return (
    <div>
      <div className="kpis">
        <Kpi label="Postings" value={String(postings.length)} />
        <Kpi label="Companies" value={String(companies)} />
        <Kpi label="Crafts" value={String(crafts)} />
        <Kpi label="Median comp" value={medianComp ? eurK(medianComp) : "—"} />
        <Kpi label="Top company" value={companyLeaderboard(postings)[0]?.company ?? "—"} />
      </div>
      <div className="card">
        <h3>Craft mix</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={craftMix}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="craft" angle={-30} textAnchor="end" height={70} />
            <YAxis /><Tooltip />
            <Bar dataKey="count" fill="#4c6ef5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3>Modality split</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={modalityMix}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="modality" /><YAxis /><Tooltip />
            <Bar dataKey="count" fill="#12b886" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="kpi"><div className="value">{value}</div><div className="label">{label}</div></div>;
}
```

- [ ] **Step 6: Verify + commit**

Run: `npm test && npm run build`
Expected: pass.
```bash
git add -A
git commit -m "feat: overview view with KPIs and mix charts"
```

---

### Task 7: Compensation & Volume by Month (centerpiece)

**Files:**
- Create: `src/views/candleData.ts`, `src/components/CandleChart.tsx`
- Modify: `src/views/CompVolume.tsx`
- Test: `src/views/candleData.test.ts`

**Interfaces:**
- Consumes: `Posting` (Task 2); `compByMonthYear`, `volumeByMonthYear`, `MIN_N` (Task 3).
- Produces:
  - `YEAR_COLORS: Record<number, string>` and `colorForYear(year: number): string`
  - `type CandleRow = { month: number; monthLabel: string; [seriesKey: string]: number | string }` where each year contributes keys `y{year}_low/p25/median/p75/high/n`.
  - `buildCandleData(postings): { rows: CandleRow[]; years: number[] }`
  - `buildVolumeData(postings): { rows: { month: number; monthLabel: string; [y: string]: number | string }[]; years: number[] }`

- [ ] **Step 1: Write the failing test**

`src/views/candleData.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- candleData`
Expected: FAIL.

- [ ] **Step 3: Implement `src/views/candleData.ts`**

```ts
import { Posting } from "../data/types";
import { compByMonthYear, volumeByMonthYear } from "../data/aggregate";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PALETTE = ["#e8590c", "#1c7ed6", "#2f9e44", "#ae3ec9", "#f08c00"];

export function colorForYear(year: number): string {
  return PALETTE[((year % PALETTE.length) + PALETTE.length) % PALETTE.length];
}

export const YEAR_COLORS = {} as Record<number, string>;

export interface CandleRow { month: number; monthLabel: string; [k: string]: number | string; }

export function buildCandleData(postings: Posting[]): { rows: CandleRow[]; years: number[] } {
  const cells = compByMonthYear(postings);
  const years = [...new Set(cells.map((c) => c.year))].sort();
  years.forEach((y) => (YEAR_COLORS[y] = colorForYear(y)));
  const rows: CandleRow[] = MONTHS.map((label, i) => ({ month: i + 1, monthLabel: label }));
  for (const c of cells) {
    const row = rows[c.month - 1];
    row[`y${c.year}_low`] = c.low;
    row[`y${c.year}_p25`] = c.p25;
    row[`y${c.year}_median`] = c.median;
    row[`y${c.year}_p75`] = c.p75;
    row[`y${c.year}_high`] = c.high;
    row[`y${c.year}_n`] = c.n;
  }
  return { rows, years };
}

export function buildVolumeData(postings: Posting[]): { rows: { month: number; monthLabel: string; [k: string]: number | string }[]; years: number[] } {
  const cells = volumeByMonthYear(postings);
  const years = [...new Set(cells.map((c) => c.year))].sort();
  const rows = MONTHS.map((label, i) => {
    const row: { month: number; monthLabel: string; [k: string]: number | string } = { month: i + 1, monthLabel: label };
    years.forEach((y) => (row[`y${y}`] = 0));
    return row;
  });
  for (const c of cells) rows[c.month - 1][`y${c.year}`] = c.count;
  return { rows, years };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- candleData`
Expected: PASS.

- [ ] **Step 5: Implement `src/components/CandleChart.tsx`**

Recharts has no candlestick; render one with a custom `Bar` shape. Each year is a `Bar` whose `dataKey` is the p25 value but whose custom shape reads the full `y{year}_*` fields from `payload` and draws wick (low→high), box (p25→p75), and median line. Dodge years via `barGap`/`barCategoryGap`.

```tsx
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { CandleRow, colorForYear } from "../views/candleData";
import { eurK } from "../format";

interface Props { rows: CandleRow[]; years: number[]; }

// Custom shape: draw a candle from the row payload for a given year.
function makeCandle(year: number) {
  return (props: any) => {
    const { x, width, background, payload } = props;
    const color = colorForYear(year);
    const low = payload[`y${year}_low`];
    const high = payload[`y${year}_high`];
    const p25 = payload[`y${year}_p25`];
    const p75 = payload[`y${year}_p75`];
    const median = payload[`y${year}_median`];
    if (high == null) return <g />;
    // background gives the plotting area; map value->pixel via its y/height + domain.
    const { y: ay, height: ah, domainMin, domainMax } = background as any;
    const scale = (v: number) => ay + ah * (1 - (v - domainMin) / (domainMax - domainMin));
    const cx = x + width / 2;
    const boxTop = scale(p75), boxBottom = scale(p25);
    return (
      <g>
        <line x1={cx} x2={cx} y1={scale(high)} y2={scale(low)} stroke={color} strokeWidth={1.5} />
        <rect x={x + width * 0.15} width={width * 0.7} y={boxTop} height={Math.max(1, boxBottom - boxTop)}
          fill={color} fillOpacity={0.35} stroke={color} />
        <line x1={x + width * 0.15} x2={x + width * 0.85} y1={scale(median)} y2={scale(median)} stroke={color} strokeWidth={2} />
      </g>
    );
  };
}
```

**Note on scaling:** Recharts' default shape `background` does not expose the y-domain. To keep the candle mapping correct and self-contained, compute the domain in this component and pass it via a wrapper that injects `domainMin/domainMax/ y / height` into each shape's `background`. Implement it as:

```tsx
export function CandleChart({ rows, years }: Props) {
  const allVals: number[] = [];
  rows.forEach((r) => years.forEach((y) => {
    [r[`y${y}_low`], r[`y${y}_high`]].forEach((v) => typeof v === "number" && allVals.push(v));
  }));
  const domainMin = allVals.length ? Math.min(...allVals) * 0.95 : 0;
  const domainMax = allVals.length ? Math.max(...allVals) * 1.05 : 1;

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={rows} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="monthLabel" />
        <YAxis domain={[domainMin, domainMax]} tickFormatter={(v) => eurK(v as number)} width={70} />
        <Tooltip content={<CandleTooltip years={years} />} />
        <Legend payload={years.map((y) => ({ value: String(y), type: "square", color: colorForYear(y), id: String(y) }))} />
        {years.map((y) => (
          <Bar key={y} dataKey={`y${y}_p25`} name={String(y)} fill={colorForYear(y)}
            shape={(props: any) =>
              makeCandle(y)({ ...props, background: { ...props.background, domainMin, domainMax } })} />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CandleTooltip({ active, payload, label, years }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="card" style={{ margin: 0 }}>
      <strong>{label}</strong>
      {years.map((y: number) => row[`y${y}_median`] != null && (
        <div key={y} style={{ color: colorForYear(y) }}>
          {y}: median {eurK(row[`y${y}_median`])} (p25 {eurK(row[`y${y}_p25`])}–p75 {eurK(row[`y${y}_p75`])}), n={row[`y${y}_n`]}
        </div>
      ))}
    </div>
  );
}
```

> Implementation guidance: if injecting the domain through `background` proves unreliable across Recharts versions, replace the custom-shape approach with an explicit SVG overlay: keep the `<ComposedChart>` for axes/grid/tooltip, add a `ReferenceArea`-free absolutely-positioned `<svg>` layer sized to the chart, and draw candles using the same `scale()` with a `y`/`height` measured from the plotting area. The data contract (`buildCandleData`) and the visual spec (wick low→high, box p25→p75, median line, dodged by year, colored by year) stay identical. Verify visually in Step 7.

- [ ] **Step 6: Implement `src/views/CompVolume.tsx`**

```tsx
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Posting } from "../data/types";
import { buildCandleData, buildVolumeData, colorForYear } from "./candleData";
import { CandleChart } from "../components/CandleChart";

export function CompVolume({ postings }: { postings: Posting[] }) {
  const candle = buildCandleData(postings);
  const vol = buildVolumeData(postings);
  return (
    <div>
      <div className="card">
        <h3>Compensation by month (median comp; box = p25–p75; wick = low–high)</h3>
        <p className="muted">Candles dodged and colored by year. Months with no data are blank.</p>
        <CandleChart rows={candle.rows} years={candle.years} />
      </div>
      <div className="card">
        <h3>Positions posted by month</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={vol.rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
            {vol.years.map((y) => (
              <Bar key={y} dataKey={`y${y}`} name={String(y)} fill={colorForYear(y)} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
```

- [ ] **Step 7: Visual verification**

Run: `npm run dev`, open the app on the "Comp & Volume" tab. Confirm: candles appear per month, dodged and colored by year; wick spans low→high, box spans p25→p75, median line visible; volume bars share the same year colors; changing a filter updates both panels. If the candle scaling looks wrong, apply the SVG-overlay fallback from Step 5's guidance.

- [ ] **Step 8: Verify + commit**

Run: `npm test && npm run build`
```bash
git add -A
git commit -m "feat: compensation candle + volume by month centerpiece"
```

---

### Task 8: Companies leaderboard + detail

**Files:**
- Modify: `src/views/Companies.tsx`
- Test: (covered by Task 3 aggregation tests; no new logic tests)

**Interfaces:**
- Consumes: `Posting` (Task 2); `companyLeaderboard`, `CompanyStat` (Task 3); `eur`, `eurK` (Task 6).
- Produces: interactive Companies view with drill-down.

- [ ] **Step 1: Implement `src/views/Companies.tsx`**

```tsx
import { useMemo, useState } from "react";
import { Posting } from "../data/types";
import { companyLeaderboard } from "../data/aggregate";
import { eur, eurK } from "../format";

type SortKey = "count" | "medianComp";

export function Companies({ postings }: { postings: Posting[] }) {
  const [sort, setSort] = useState<SortKey>("count");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const board = useMemo(() => {
    const b = companyLeaderboard(postings);
    const f = q ? b.filter((r) => r.company.toLowerCase().includes(q.toLowerCase())) : b;
    return [...f].sort((a, b2) =>
      sort === "count" ? b2.count - a.count : (b2.medianComp ?? -1) - (a.medianComp ?? -1)
    );
  }, [postings, sort, q]);

  const detail = selected ? postings.filter((p) => p.company === selected) : [];

  return (
    <div>
      <div className="card">
        <input placeholder="Search company…" value={q} onChange={(e) => setQ(e.target.value)} />
        <table>
          <thead><tr>
            <th onClick={() => setSort("count")}>Company</th>
            <th onClick={() => setSort("count")}>Postings ↓</th>
            <th onClick={() => setSort("medianComp")}>Median comp</th>
            <th>Crafts</th>
          </tr></thead>
          <tbody>
            {board.slice(0, 100).map((r) => (
              <tr key={r.company} onClick={() => setSelected(r.company)} style={{ cursor: "pointer" }}>
                <td>{r.company}</td><td>{r.count}</td>
                <td>{r.medianComp ? eurK(r.medianComp) : "—"}</td>
                <td>{r.crafts.join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selected && (
        <div className="card">
          <h3>{selected} — {detail.length} postings <button onClick={() => setSelected(null)}>close</button></h3>
          <table>
            <thead><tr><th>Date</th><th>Role</th><th>Craft</th><th>Level</th><th>Modality</th><th>Mid</th></tr></thead>
            <tbody>
              {detail.map((p, i) => (
                <tr key={i}>
                  <td>{p.date ? p.date.toISOString().slice(0, 10) : "—"}</td>
                  <td>{p.role}</td><td>{p.craft}</td><td>{p.level}</td><td>{p.modality}</td>
                  <td>{eur(p.midEur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npm test && npm run build`; check the tab in `npm run dev` (rows sort, search filters, click opens detail).
```bash
git add -A
git commit -m "feat: companies leaderboard with drill-down detail"
```

---

### Task 9: Roles & Crafts view

**Files:**
- Modify: `src/views/RolesCrafts.tsx`

**Interfaces:**
- Consumes: `Posting` (Task 2); `topCompaniesForCraft`, `compBy`, `distinct` (Task 3); `eurK` (Task 6).
- Produces: craft breakdown, "who hires most of craft X", role keyword search.

- [ ] **Step 1: Implement `src/views/RolesCrafts.tsx`**

```tsx
import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting } from "../data/types";
import { compBy, distinct, topCompaniesForCraft } from "../data/aggregate";

export function RolesCrafts({ postings }: { postings: Posting[] }) {
  const crafts = useMemo(() => distinct(postings, (p) => p.craft).sort(), [postings]);
  const [craft, setCraft] = useState<string>(crafts[0] ?? "");
  const [q, setQ] = useState("");

  const craftCounts = compBy(postings, "craft").map((d) => ({ craft: d.key, count: d.n }));
  const top = craft ? topCompaniesForCraft(postings, craft).slice(0, 15) : [];
  const roleMatches = q
    ? postings.filter((p) => p.role.toLowerCase().includes(q.toLowerCase())).slice(0, 50)
    : [];

  return (
    <div>
      <div className="card">
        <h3>Postings per craft</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={craftCounts.sort((a, b) => b.count - a.count)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="craft" angle={-30} textAnchor="end" height={70} /><YAxis /><Tooltip />
            <Bar dataKey="count" fill="#4c6ef5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3>Who's hiring most of:
          <select value={craft} onChange={(e) => setCraft(e.target.value)}>
            {crafts.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </h3>
        <table>
          <thead><tr><th>Company</th><th>Postings</th></tr></thead>
          <tbody>{top.map((r) => <tr key={r.company}><td>{r.company}</td><td>{r.count}</td></tr>)}</tbody>
        </table>
      </div>
      <div className="card">
        <h3>Role search</h3>
        <input placeholder="e.g. staff, platform, ML…" value={q} onChange={(e) => setQ(e.target.value)} />
        <table>
          <thead><tr><th>Role</th><th>Company</th><th>Craft</th><th>Level</th></tr></thead>
          <tbody>{roleMatches.map((p, i) =>
            <tr key={i}><td>{p.role}</td><td>{p.company}</td><td>{p.craft}</td><td>{p.level}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npm test && npm run build`; check the tab.
```bash
git add -A
git commit -m "feat: roles & crafts view"
```

---

### Task 10: Compensation detail view

**Files:**
- Modify: `src/views/Compensation.tsx`

**Interfaces:**
- Consumes: `Posting` (Task 2); `compBy`, `DimStat`, `MIN_N` (Task 3); `FX` (Task 2); `eurK` (Task 6).
- Produces: comp range bars by craft/level/modality with FX note and small-n badge.

- [ ] **Step 1: Implement `src/views/Compensation.tsx`**

```tsx
import { useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting, FX } from "../data/types";
import { compBy, MIN_N } from "../data/aggregate";
import { eurK } from "../format";

type Dim = "craft" | "levelFamily" | "modality";

export function Compensation({ postings }: { postings: Posting[] }) {
  const [dim, setDim] = useState<Dim>("craft");
  const stats = compBy(postings, dim);
  // Represent range as a stacked bar: base = p25 (transparent), band = p75-p25.
  const data = stats.map((d) => ({
    key: d.key + (d.n < MIN_N ? " *" : ""),
    base: d.p25, band: Math.max(0, d.p75 - d.p25),
    median: d.median, low: d.low, high: d.high, n: d.n,
  }));

  return (
    <div>
      <div className="card">
        <h3>Compensation range (p25–p75, median in tooltip) by{" "}
          <select value={dim} onChange={(e) => setDim(e.target.value as Dim)}>
            <option value="craft">Craft</option>
            <option value="levelFamily">Level family</option>
            <option value="modality">Modality</option>
          </select>
        </h3>
        <p className="muted">
          EUR-normalized. USD×{FX.USD}, GBP×{FX.GBP}. Bars marked * have fewer than {MIN_N} samples.
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => eurK(v as number)} />
            <YAxis type="category" dataKey="key" width={110} />
            <Tooltip content={<RangeTooltip />} />
            <Bar dataKey="base" stackId="a" fill="transparent" />
            <Bar dataKey="band" stackId="a" fill="#4c6ef5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RangeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card" style={{ margin: 0 }}>
      <strong>{d.key}</strong>
      <div>median {eurK(d.median)}</div>
      <div>p25 {eurK(d.base)} – p75 {eurK(d.base + d.band)}</div>
      <div>range {eurK(d.low)} – {eurK(d.high)}</div>
      <div>n = {d.n}</div>
    </div>
  );
}
```

- [ ] **Step 2: Verify + commit**

Run: `npm test && npm run build`; check the tab. Confirm FX note visible and `*` appears on low-n bars.
```bash
git add -A
git commit -m "feat: compensation detail view with range bars"
```

---

## Final verification

- [ ] Run full suite: `npm test` — all green.
- [ ] Build: `npm run build` — succeeds.
- [ ] `npm run dev` — all five tabs render; live data loads (or cache banner shows); filters drive every view; the Comp & Volume centerpiece shows year-colored candles + volume.

## Self-Review notes (author)

- **Spec coverage:** live fetch + fallback (T4), normalization incl. AVG-skip/modality-merge/level-fix/FX/×1000 (T2), aggregations + small-n (T3), global filter bar (T5), Overview (T6), Comp&Volume centerpiece with year colors + volume (T7), Companies leaderboard+detail (T8), who-hires-craft-X + role search (T9), comp by craft/level/modality + FX note (T10). All spec sections mapped.
- **Sparsity honesty:** no per-company time series; company view is leaderboard+detail. Time labeled as snapshot cadence in App header and CompVolume.
- **Risk flagged:** the Recharts custom-candle scaling is the one place with version sensitivity — Task 7 Step 5 includes a concrete SVG-overlay fallback with the same data contract and visual spec, plus a visual-verification step.

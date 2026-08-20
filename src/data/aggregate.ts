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

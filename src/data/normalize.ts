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

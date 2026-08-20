import { Posting } from "../data/types";
import { compByMonthYear, volumeByMonthYear } from "../data/aggregate";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
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

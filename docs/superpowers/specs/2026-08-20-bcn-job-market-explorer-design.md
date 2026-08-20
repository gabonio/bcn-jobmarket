# BCN Tech Job Market Explorer — Design

**Date:** 2026-08-20
**Status:** Approved for planning

## Purpose

A single-page web app that turns a Google Sheet of Barcelona tech job postings
into an interactive analytics tool: filter by company/craft/level/modality,
find who's hiring most, and understand compensation and hiring volume over time.

## Data source

- **Sheet:** Google Sheets doc `1GIOcNdlraQDV-qD45deFCRNfPDVIkELE5RGAeq7gQPA`,
  gid `1472483134`.
- **Fetch:** Live, in-browser, on each load, via the CORS-friendly `gviz` CSV
  endpoint:
  `https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&gid=<GID>`
  (verified to return HTTP 200 with `access-control-allow-origin`).
- **Fallback:** A snapshot CSV bundled in the app. If the live fetch fails,
  load the snapshot and show a banner: "Showing cached data from {date}".
- No backend. ~1,266 rows fit in memory; all filtering/aggregation is
  client-side and instant.

### Raw schema (row 2 is the header)

`Date, Company, Role, Craft, Level, Location, Modality, Currency, Low end, Mid,
High end, RSU, Bonus` (trailing empty columns ignored).

Row 1 is a stray `AVG` summary row and MUST be skipped.

### Known data characteristics (drive design decisions)

- **478 companies, median 1 row each**; only 23 have ≥10 rows. → Per-company
  time series are not viable. Company view is a **leaderboard + detail**, not a
  trend line.
- **`Date` is a collection/batch date, not a true posting date** — 37 distinct
  dates, clustered into monthly first-of-month batches (one day has 178 rows).
  → Time axis is **coarse monthly buckets** and MUST be labeled as snapshot
  cadence, not live market flow.
- Salary numbers are in **thousands of the row's currency** (`50` = 50k).
- Currency mix: EUR (1200), USD (63), GBP/"BP" (3).
- Month × year coverage is uneven (2024 has only Jan/Feb/Jul; 2025 May–Dec;
  2026 Jan–Aug). Empty cells render as gaps, never faked.

## Normalization layer (pure, unit-tested functions)

This is where correctness lives. A `normalize(rawRows) -> Posting[]` pipeline:

- Skip the `AVG` row; treat row 2 as header.
- Drop fully-empty rows.
- **Date:** parse both `M/D/YYYY` and `YYYY-MM-DD`; derive `year` and
  `month` (1–12). Rows with unparseable dates are excluded from time views but
  kept for non-time aggregates.
- **Modality:** merge `Full Remote` + `Remote` → `Remote`; keep `In Office`,
  `Hybrid`. Unknown/`N/A` → `Unknown`.
- **Level:** normalize `M1` → `M-1`; parse into `{ family: IC | Manager |
  Product | Other, rank: number }`. Family from prefix (`IC-`, `M-`, `P-`).
- **Currency:** normalize `BP` → `GBP`. Convert Low/Mid/High to EUR using a
  single exported constant `FX = { USD: 0.92, GBP: 1.17, EUR: 1 }` (approximate,
  editable in one place, surfaced in the UI). Keep the original currency +
  original values on the row for detail display.
- **Comp:** values × 1000 (stored as EUR). `mid` falls back to
  `(low + high) / 2` when blank; a row needs at least one of low/mid/high to
  count toward comp stats.
- Trim whitespace on all string fields.

Output type (illustrative):

```ts
type Posting = {
  date: Date; year: number; month: number;
  company: string; role: string; craft: string;
  level: string; levelFamily: string; levelRank: number;
  location: string; modality: string;
  currency: string;                 // original
  lowEur?: number; midEur?: number; highEur?: number;
  origLow?: number; origMid?: number; origHigh?: number;
  rsu: boolean; bonus?: string;
};
```

## Aggregation layer (pure, unit-tested functions)

- `applyFilters(postings, filters) -> Posting[]`
- `percentiles(values, [25,50,75]) -> {...}` (linear interpolation)
- `compByMonthYear(postings) -> { year, month, low, p25, median, p75, high, n }[]`
- `volumeByMonthYear(postings) -> { year, month, count }[]`
- `companyLeaderboard(postings, sortKey) -> { company, count, crafts, medianComp }[]`
- `topCompaniesForCraft(postings, craft) -> { company, count }[]`
- `compBy(postings, dimension) -> { key, p25, median, p75, low, high, n }[]`
  (dimension = craft | level | modality)

Small-sample guard: comp stats hide (or badge "low n") when `n` below a
threshold (default 3).

## Global filter bar

Applies to every view. Controls: company (searchable multi-select), craft,
level (or level family), modality, location, currency. Filters compose (AND).
A "clear all" reset. Active filter state drives all charts and tables.

## Views

### 1. Overview
KPI tiles: total postings, distinct companies, distinct crafts, EUR median
comp, date range. Plus: craft mix (bar), modality split, level-family
distribution. Monthly-volume mini chart labeled "snapshot batches".

### 2. Compensation & Volume by Month  (V1 centerpiece)
Two stacked panels sharing one X axis (month Jan→Dec) and one **year-color
legend**:

- **Top — compensation candles.** One candle per (year, month), grouped/dodged
  side-by-side within each month slot. Encoding: **wick = low→high**, **box =
  p25→p75 of Mid**, **line = median**. Colored by year.
  - Note: keeps the candlestick *visual* but fills it with a statistical
    distribution (not financial OHLC). Documented in-UI via legend/tooltip.
- **Bottom — positions posted.** Bars of row count per (year, month), same X
  axis, **same year colors**.
- Both recompute live from the global filters.
- Empty (year, month) cells render as gaps.
- Implemented with Recharts `ComposedChart` + a custom candle shape (Recharts
  has no native candlestick); volume panel uses grouped `Bar`s keyed by year.

### 3. Companies
Sortable, searchable **leaderboard**: company, # postings, crafts hired, median
comp. Sort by volume or comp. Click a row → **company detail**: all its
postings (table), its comp bands, crafts it hires.

### 4. Roles & Crafts
Craft breakdown. **"Who's hiring most of craft X"**: pick a craft → ranked
companies by count. Role keyword search over the `Role` free-text field.

### 5. Compensation detail
Median / p25–p75 range by craft, by level, by modality (range bars). Company
pay comparison. A visible FX-rate note ("USD/GBP converted to EUR at {rates}").

## Honesty guardrails (in-UI)

- Time axes labeled as collection cadence, not live posting flow.
- Comp stats show `n`; suppressed/badged below the small-sample threshold.
- FX conversion rate always visible where converted comp is shown.
- Cached-data banner when live fetch fails.

## Tech stack

- Vite + React + TypeScript.
- Recharts (charts), PapaParse (CSV parsing).
- Plain CSS / CSS modules — no heavy UI framework.
- Vitest for unit tests.
- Located at `/Users/gabriel.cruz/Documents/GitHub/bcn-jobmarket`.

## Testing strategy

Unit tests target the pure normalization + aggregation functions, where the
correctness risk concentrates:

- Skips `AVG` row and empty rows.
- Date parsing for both formats; year/month derivation.
- Modality merge, level normalization/parse, currency normalization.
- FX conversion and ×1000 scaling.
- `mid` fallback logic.
- Percentile math (known inputs → known outputs).
- `compByMonthYear` / `volumeByMonthYear` bucketing incl. empty cells.
- Leaderboard and `topCompaniesForCraft` ranking.
- Small-sample suppression.

UI layer stays thin over tested functions; no heavy component tests in v1.

## Explicitly out of scope for v1

- Per-company time-series trends (data too sparse).
- Editing the sheet from the app (read-only).
- Auth / multi-user / persistence of filter state.
- True live posting-date flow (data doesn't support it).

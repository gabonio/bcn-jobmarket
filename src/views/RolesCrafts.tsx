import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting } from "../data/types";
import { companyLeaderboard, countBy, distinct, percentiles } from "../data/aggregate";
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE } from "../chartTheme";
import { eur, levelGroup, levelName, levelSort, monthYear } from "../format";
import { JobPostsDialog } from "../components/JobPostsDialog";
import { axisHeightForLabels, WrappedAxisTick } from "../components/WrappedAxisTick";

const ROLE_MATCH_CAP = 200;
type SortKey = "date" | "role" | "company" | "craft" | "level" | "lowEur" | "midEur" | "highEur";
type SortDirection = "asc" | "desc";

const SORT_HEADERS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "role", label: "Role" },
  { key: "company", label: "Company" },
  { key: "craft", label: "Craft" },
  { key: "level", label: "Level" },
  { key: "lowEur", label: "Low" },
  { key: "midEur", label: "Mid" },
  { key: "highEur", label: "High" },
];

function sortValue(posting: Posting, key: SortKey): string | number | null {
  if (key === "date") {
    return posting.year != null && posting.month != null
      ? posting.year * 12 + posting.month
      : null;
  }
  return posting[key] ?? null;
}

function comparePostings(a: Posting, b: Posting, key: SortKey, direction: SortDirection): number {
  const aValue = sortValue(a, key);
  const bValue = sortValue(b, key);
  const aMissing = aValue == null || aValue === "";
  const bMissing = bValue == null || bValue === "";
  if (aMissing || bMissing) {
    if (aMissing && bMissing) return 0;
    return aMissing ? 1 : -1;
  }
  const comparison = typeof aValue === "number" && typeof bValue === "number"
    ? aValue - bValue
    : String(aValue).localeCompare(String(bValue), undefined, { sensitivity: "base" });
  return direction === "asc" ? comparison : -comparison;
}

export function RolesCrafts({ postings }: { postings: Posting[] }) {
  const crafts = useMemo(() => distinct(postings, (p) => p.craft).sort(), [postings]);
  const levels = useMemo(() => distinct(postings, (p) => p.level).sort(levelSort), [postings]);
  const levelGroups = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const level of levels) {
      const group = levelGroup(level);
      (groups.get(group) ?? groups.set(group, []).get(group)!).push(level);
    }
    return [...groups.entries()];
  }, [levels]);
  const [craft, setCraft] = useState("");
  const [level, setLevel] = useState("");
  const [q, setQ] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [selectedCraft, setSelectedCraft] = useState<string | null>(null);
  const [showSalaryDetails, setShowSalaryDetails] = useState(false);

  // Use countBy (not compBy) so postings without a midEur value are still
  // counted — compBy drops comp-less rows, which would undercount crafts
  // (same class of bug fixed in Task 6 for the Overview).
  const craftCounts = countBy(postings, "craft").map((d) => ({ craft: d.key, count: d.count }));
  const craftAxisHeight = axisHeightForLabels(craftCounts.map((d) => d.craft));
  const craftChartHeight = 210 + craftAxisHeight;
  const hiringPostings = useMemo(() => postings.filter((p) =>
    (!craft || p.craft === craft) && (!level || p.level === level)
  ), [postings, craft, level]);
  const top = useMemo(() => companyLeaderboard(hiringPostings).slice(0, 15), [hiringPostings]);
  const roleMatchesAll = q
    ? hiringPostings.filter((p) => p.role.toLowerCase().includes(q.toLowerCase()))
    : hiringPostings;
  const roleMatches = [...roleMatchesAll]
    .sort((a, b) => comparePostings(a, b, sortKey, sortDirection))
    .slice(0, ROLE_MATCH_CAP);
  const roleMatchesShown = Math.min(roleMatchesAll.length, ROLE_MATCH_CAP);
  const roleSalarySummary = useMemo(() => {
    const lows = roleMatchesAll
      .map((p) => p.lowEur ?? p.midEur)
      .filter((value): value is number => value != null);
    const mids = roleMatchesAll
      .map((p) => p.midEur)
      .filter((value): value is number => value != null);
    const highs = roleMatchesAll
      .map((p) => p.highEur ?? p.midEur)
      .filter((value): value is number => value != null);
    const [p25, median, p75] = mids.length ? percentiles(mids, [25, 50, 75]) : [null, null, null];
    return {
      low: lows.length ? Math.min(...lows) : null,
      p25,
      median,
      p75,
      high: highs.length ? Math.max(...highs) : null,
    };
  }, [roleMatchesAll]);
  const selectedPostings = selectedCraft
    ? postings.filter((p) => p.craft === selectedCraft)
    : [];

  function selectCraft(entry: any) {
    const craftValue = entry?.payload?.craft ?? entry?.craft;
    if (typeof craftValue === "string") setSelectedCraft(craftValue);
  }

  function requestSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "date" ? "desc" : "asc");
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Postings per craft</h3>
        <ResponsiveContainer width="100%" height={craftChartHeight}>
          <BarChart data={craftCounts.sort((a, b) => b.count - a.count)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="craft" interval={0} height={craftAxisHeight} tick={<WrappedAxisTick />} /><YAxis /><Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
            <Bar className="clickable-chart" dataKey="count" fill="#4c6ef5" onClick={selectCraft} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <div className="hiring-filter-header">
          <h3>Who's hiring most of:</h3>
          <label className="hiring-filter">
            Craft
            <select aria-label="Filter hiring companies by craft" value={craft} onChange={(e) => setCraft(e.target.value)}>
              <option value="">All crafts</option>
              {crafts.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="hiring-filter">
            Seniority
            <select aria-label="Filter hiring companies by seniority" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="">All seniority levels</option>
              {levelGroups.map(([group, groupLevels]) => (
                <optgroup key={group} label={group}>
                  {groupLevels.map((value) => <option key={value} value={value}>{levelName(value)}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <table>
          <thead><tr><th>Company</th><th>Postings</th></tr></thead>
          <tbody>
            {top.map((r) => <tr key={r.company}><td>{r.company}</td><td>{r.count}</td></tr>)}
            {top.length === 0 && <tr><td colSpan={2}>No postings match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="card">
        <div className="role-search-header">
          <div className="role-search-controls">
            <h3>Role search</h3>
            <input className="role-search-input" placeholder="e.g. staff, platform, ML…" value={q} onChange={(e) => setQ(e.target.value)} />
            <p className="role-search-count">
              {roleMatchesAll.length > ROLE_MATCH_CAP
                ? `showing first ${ROLE_MATCH_CAP} of ${roleMatchesAll.length} roles`
                : `${roleMatchesShown} of ${roleMatchesAll.length} roles`}
            </p>
          </div>
          <div className="role-salary-summary" aria-label="Salary summary for matching roles">
            <span className="role-salary-summary-title">Salary band for matching roles</span>
            <div className="role-salary-stats">
              <div className="role-salary-stat"><span>Lowest</span><strong>{eur(roleSalarySummary.low)}</strong></div>
              <div className="role-salary-stat-wrap">
                <button
                  type="button"
                  className="role-salary-stat role-salary-stat-median"
                  aria-label="Show percentile details for the median salary"
                  aria-expanded={showSalaryDetails}
                  aria-controls="role-salary-percentiles"
                  onMouseEnter={() => setShowSalaryDetails(true)}
                  onMouseLeave={() => setShowSalaryDetails(false)}
                  onFocus={() => setShowSalaryDetails(true)}
                  onBlur={() => setShowSalaryDetails(false)}
                  onClick={() => setShowSalaryDetails(true)}
                >
                  <span className="role-salary-stat-label">Median <span className="role-salary-info-icon" aria-hidden="true">i</span></span>
                  <strong>{eur(roleSalarySummary.median)}</strong>
                </button>
                {showSalaryDetails && (
                  <div id="role-salary-percentiles" className="role-salary-tooltip" role="tooltip">
                    <strong>Middle 50%: {eur(roleSalarySummary.p25)}–{eur(roleSalarySummary.p75)}</strong>
                    <span>P25: {eur(roleSalarySummary.p25)} · 25% are below</span>
                    <span>P75: {eur(roleSalarySummary.p75)} · 25% are above</span>
                  </div>
                )}
              </div>
              <div className="role-salary-stat"><span>Highest</span><strong>{eur(roleSalarySummary.high)}</strong></div>
            </div>
          </div>
        </div>
        <table>
          <thead>
            <tr>{SORT_HEADERS.map(({ key, label }) => {
              const active = sortKey === key;
              const indicator = active ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
              return <th key={key} aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                <button type="button" className="table-sort" onClick={() => requestSort(key)}>
                  {label} <span aria-hidden="true">{indicator}</span>
                </button>
              </th>;
            })}</tr>
          </thead>
          <tbody>{roleMatches.map((p, i) =>
            <tr key={i}>
              <td>{monthYear(p.year, p.month)}</td><td>{p.role}</td><td>{p.company}</td><td>{p.craft}</td><td>{levelName(p.level)}</td>
              <td>{eur(p.lowEur)}</td><td>{eur(p.midEur)}</td><td>{eur(p.highEur)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {selectedCraft && (
        <JobPostsDialog
          title={`Job posts · ${selectedCraft}`}
          description={`${selectedPostings.length} postings make up the ${selectedCraft} selection.`}
          postings={selectedPostings}
          onClose={() => setSelectedCraft(null)}
        />
      )}
    </div>
  );
}

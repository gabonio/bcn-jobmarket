import { useMemo, useState } from "react";
import { Posting } from "../data/types";
import { percentiles } from "../data/aggregate";
import { eur, levelName, monthYear } from "../format";

type SortKey = "date" | "company" | "role" | "craft" | "level" | "location" | "modality" | "lowEur" | "midEur" | "highEur";
type SortDirection = "asc" | "desc";

const SORT_HEADERS: { key: SortKey; label: string }[] = [
  { key: "date", label: "Date" },
  { key: "company", label: "Company" },
  { key: "role", label: "Role" },
  { key: "craft", label: "Craft" },
  { key: "level", label: "Level" },
  { key: "location", label: "Location" },
  { key: "modality", label: "Modality" },
  { key: "lowEur", label: "Low" },
  { key: "midEur", label: "Mid" },
  { key: "highEur", label: "High" },
];

function sortValue(posting: Posting, key: SortKey): string | number | null {
  if (key === "date") return posting.date?.getTime() ?? null;
  if (key === "level") return levelName(posting.level);
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

interface Props {
  title: string;
  description?: string;
  postings: Posting[];
  onClose: () => void;
}

interface SalarySummaryData {
  low: number | null;
  p25: number | null;
  median: number | null;
  p75: number | null;
  high: number | null;
}

function SalarySummary({ summary, showDetails, setShowDetails }: {
  summary: SalarySummaryData;
  showDetails: boolean;
  setShowDetails: (show: boolean) => void;
}) {
  return (
    <div className="role-salary-summary drillthrough-salary-summary" aria-label="Salary summary for matching postings">
      <span className="role-salary-summary-title">Salary band for matching postings</span>
      <div className="role-salary-stats">
        <div className="role-salary-stat"><span>Lowest</span><strong>{eur(summary.low)}</strong></div>
        <div className="role-salary-stat-wrap">
          <button
            type="button"
            className="role-salary-stat role-salary-stat-median"
            aria-label="Show percentile details for the median salary"
            aria-expanded={showDetails}
            aria-controls="drillthrough-percentiles"
            onMouseEnter={() => setShowDetails(true)}
            onMouseLeave={() => setShowDetails(false)}
            onFocus={() => setShowDetails(true)}
            onBlur={() => setShowDetails(false)}
            onClick={() => setShowDetails(true)}
          >
            <span className="role-salary-stat-label">Median <span className="role-salary-info-icon" aria-hidden="true">i</span></span>
            <strong>{eur(summary.median)}</strong>
          </button>
          {showDetails && (
            <div id="drillthrough-percentiles" className="role-salary-tooltip" role="tooltip">
              <strong>Middle 50%: {eur(summary.p25)}–{eur(summary.p75)}</strong>
              <span>P25: {eur(summary.p25)} · 25% are below</span>
              <span>P75: {eur(summary.p75)} · 25% are above</span>
            </div>
          )}
        </div>
        <div className="role-salary-stat"><span>Highest</span><strong>{eur(summary.high)}</strong></div>
      </div>
    </div>
  );
}

export function JobPostsDialog({ title, description, postings, onClose }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [query, setQuery] = useState("");
  const [showSalaryDetails, setShowSalaryDetails] = useState(false);
  const filteredPostings = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return postings;
    return postings.filter((posting) => searchableText(posting).includes(normalizedQuery));
  }, [postings, query]);
  const sortedPostings = useMemo(
    () => [...filteredPostings].sort((a, b) => comparePostings(a, b, sortKey, sortDirection)),
    [filteredPostings, sortKey, sortDirection]
  );
  const salarySummary = useMemo<SalarySummaryData>(() => {
    const lows = filteredPostings
      .map((posting) => posting.lowEur ?? posting.midEur)
      .filter((value): value is number => value != null);
    const mids = filteredPostings
      .map((posting) => posting.midEur)
      .filter((value): value is number => value != null);
    const highs = filteredPostings
      .map((posting) => posting.highEur ?? posting.midEur)
      .filter((value): value is number => value != null);
    const [p25, median, p75] = mids.length ? percentiles(mids, [25, 50, 75]) : [null, null, null];
    return {
      low: lows.length ? Math.min(...lows) : null,
      p25,
      median,
      p75,
      high: highs.length ? Math.max(...highs) : null,
    };
  }, [filteredPostings]);

  function requestSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection(key === "date" ? "desc" : "asc");
    }
  }

  function sortIndicator(key: SortKey): string {
    return sortKey === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
  }

  return (
    <div
      className="drillthrough-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="drillthrough-modal" role="dialog" aria-modal="true" aria-labelledby="drillthrough-title">
        <div className="drillthrough-header">
          <div className="drillthrough-header-content">
            <div>
              <h3 id="drillthrough-title">{title}</h3>
              {description && <p className="muted">{description}</p>}
              <input
                className="drillthrough-search"
                type="search"
                placeholder="Search job posts…"
                aria-label="Search job posts"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              {query.trim() && (
                <p className="muted drillthrough-search-count">
                  Showing {sortedPostings.length} of {postings.length} postings
                </p>
              )}
            </div>
            <SalarySummary
              summary={salarySummary}
              showDetails={showSalaryDetails}
              setShowDetails={setShowSalaryDetails}
            />
          </div>
          <button className="drillthrough-close" type="button" onClick={onClose} aria-label="Close job posts">
            ×
          </button>
        </div>
        <div className="drillthrough-table-wrap">
          <table>
            <thead>
              <tr>
                {SORT_HEADERS.map(({ key, label }) => {
                  const active = sortKey === key;
                  return (
                    <th key={key} aria-sort={active ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
                      <button type="button" className="table-sort" onClick={() => requestSort(key)}>
                        {label} <span aria-hidden="true">{sortIndicator(key)}</span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {sortedPostings.map((posting, index) => (
                <tr key={`${posting.company}-${posting.role}-${index}`}>
                  <td>{monthYear(posting.year, posting.month)}</td>
                  <td>{posting.company}</td>
                  <td>{posting.role}</td>
                  <td>{posting.craft}</td>
                  <td>{levelName(posting.level)}</td>
                  <td>{posting.location}</td>
                  <td>{posting.modality}</td>
                  <td>{eur(posting.lowEur)}</td>
                  <td>{eur(posting.midEur)}</td>
                  <td>{eur(posting.highEur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function searchableText(posting: Posting): string {
  return [
    monthYear(posting.year, posting.month),
    posting.date?.toLocaleDateString("en-CA"),
    posting.company,
    posting.role,
    posting.craft,
    posting.level,
    levelName(posting.level),
    posting.location,
    posting.modality,
    eur(posting.lowEur), posting.lowEur,
    eur(posting.midEur), posting.midEur,
    eur(posting.highEur), posting.highEur,
  ].filter((value) => value != null).join(" ").toLocaleLowerCase();
}

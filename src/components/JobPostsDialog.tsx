import { useMemo, useState } from "react";
import { Posting } from "../data/types";
import { eur, levelName } from "../format";

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

export function JobPostsDialog({ title, description, postings, onClose }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [query, setQuery] = useState("");
  const filteredPostings = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return postings;
    return postings.filter((posting) => searchableText(posting).includes(normalizedQuery));
  }, [postings, query]);
  const sortedPostings = useMemo(
    () => [...filteredPostings].sort((a, b) => comparePostings(a, b, sortKey, sortDirection)),
    [filteredPostings, sortKey, sortDirection]
  );

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
                  <td>{posting.date ? posting.date.toLocaleDateString("en-CA") : "—"}</td>
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

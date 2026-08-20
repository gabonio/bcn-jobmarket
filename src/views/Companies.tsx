import { useMemo, useState } from "react";
import { Posting } from "../data/types";
import { companyLeaderboard } from "../data/aggregate";
import { eur, eurK, levelName } from "../format";

type SortKey = "company" | "count" | "medianComp";
type SortDirection = "asc" | "desc";

export function Companies({ postings }: { postings: Posting[] }) {
  const [sort, setSort] = useState<SortKey>("count");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const board = useMemo(() => {
    const b = companyLeaderboard(postings);
    const f = q ? b.filter((r) => r.company.toLowerCase().includes(q.toLowerCase())) : b;
    return [...f].sort((a, b2) => {
      const aValue = sort === "company" ? a.company : sort === "count" ? a.count : a.medianComp;
      const bValue = sort === "company" ? b2.company : sort === "count" ? b2.count : b2.medianComp;
      const aMissing = aValue == null;
      const bMissing = bValue == null;
      if (aMissing || bMissing) {
        if (aMissing && bMissing) return 0;
        return aMissing ? 1 : -1;
      }
      const comparison = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue), undefined, { sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [postings, sort, sortDirection, q]);

  function requestSort(key: SortKey) {
    if (key === sort) {
      setSortDirection((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSort(key);
      setSortDirection("desc");
    }
  }

  function sortIndicator(key: SortKey): string {
    return sort === key ? (sortDirection === "asc" ? "↑" : "↓") : "↕";
  }

  const detail = selected ? postings.filter((p) => p.company === selected) : [];

  return (
    <div>
      <div className="card">
        <input placeholder="Search company…" value={q} onChange={(e) => setQ(e.target.value)} />
        <table>
          <thead><tr>
            <th aria-sort={sort === "company" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
              <button type="button" className="table-sort" onClick={() => requestSort("company")}>
                Company <span aria-hidden="true">{sortIndicator("company")}</span>
              </button>
            </th>
            <th aria-sort={sort === "count" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
              <button type="button" className="table-sort" onClick={() => requestSort("count")}>
                Postings <span aria-hidden="true">{sortIndicator("count")}</span>
              </button>
            </th>
            <th aria-sort={sort === "medianComp" ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}>
              <button type="button" className="table-sort" onClick={() => requestSort("medianComp")}>
                Median comp <span aria-hidden="true">{sortIndicator("medianComp")}</span>
              </button>
            </th>
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
            <thead><tr><th>Date</th><th>Role</th><th>Craft</th><th>Level</th><th>Modality</th><th>Low</th><th>Mid</th><th>High</th></tr></thead>
            <tbody>
              {detail.map((p, i) => (
                <tr key={i}>
                  <td>{p.date ? p.date.toLocaleDateString("en-CA") : "—"}</td>
                  <td>{p.role}</td><td>{p.craft}</td><td>{levelName(p.level)}</td><td>{p.modality}</td>
                  <td>{eur(p.lowEur)}</td><td>{eur(p.midEur)}</td><td>{eur(p.highEur)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

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

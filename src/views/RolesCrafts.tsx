import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting } from "../data/types";
import { countBy, distinct, topCompaniesForCraft } from "../data/aggregate";
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE } from "../chartTheme";
import { eur } from "../format";

const ROLE_MATCH_CAP = 200;

export function RolesCrafts({ postings }: { postings: Posting[] }) {
  const crafts = useMemo(() => distinct(postings, (p) => p.craft).sort(), [postings]);
  const [craft, setCraft] = useState<string>(crafts[0] ?? "");
  const [q, setQ] = useState("");

  // Use countBy (not compBy) so postings without a midEur value are still
  // counted — compBy drops comp-less rows, which would undercount crafts
  // (same class of bug fixed in Task 6 for the Overview).
  const craftCounts = countBy(postings, "craft").map((d) => ({ craft: d.key, count: d.count }));
  const top = craft ? topCompaniesForCraft(postings, craft).slice(0, 15) : [];
  const roleMatchesAll = q
    ? postings.filter((p) => p.role.toLowerCase().includes(q.toLowerCase()))
    : postings;
  const roleMatches = roleMatchesAll.slice(0, ROLE_MATCH_CAP);
  const roleMatchesShown = Math.min(roleMatchesAll.length, ROLE_MATCH_CAP);

  return (
    <div>
      <div className="card">
        <h3>Postings per craft</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={craftCounts.sort((a, b) => b.count - a.count)}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="craft" angle={-30} textAnchor="end" height={70} /><YAxis /><Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
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
        <p>
          {roleMatchesAll.length > ROLE_MATCH_CAP
            ? `showing first ${ROLE_MATCH_CAP} of ${roleMatchesAll.length} roles`
            : `${roleMatchesShown} of ${roleMatchesAll.length} roles`}
        </p>
        <table>
          <thead><tr><th>Role</th><th>Company</th><th>Craft</th><th>Level</th><th>Low</th><th>Mid</th><th>High</th></tr></thead>
          <tbody>{roleMatches.map((p, i) =>
            <tr key={i}>
              <td>{p.role}</td><td>{p.company}</td><td>{p.craft}</td><td>{p.level}</td>
              <td>{eur(p.lowEur)}</td><td>{eur(p.midEur)}</td><td>{eur(p.highEur)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

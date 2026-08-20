import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting } from "../data/types";
import { companyLeaderboard, countBy, distinct, percentiles } from "../data/aggregate";
import { eurK } from "../format";

export function Overview({ postings }: { postings: Posting[] }) {
  const companies = distinct(postings, (p) => p.company).length;
  const crafts = distinct(postings, (p) => p.craft).length;
  const mids = postings.map((p) => p.midEur).filter((v): v is number => v != null);
  const medianComp = mids.length ? percentiles(mids, [50])[0] : null;
  const craftMix = countBy(postings, "craft")
    .map((r) => ({ craft: r.key, count: r.count }));
  const modalityMix = countBy(postings, "modality")
    .map((r) => ({ modality: r.key, count: r.count }));

  return (
    <div>
      <div className="kpis">
        <Kpi label="Postings" value={String(postings.length)} />
        <Kpi label="Companies" value={String(companies)} />
        <Kpi label="Crafts" value={String(crafts)} />
        <Kpi label="Median comp" value={eurK(medianComp)} />
        <Kpi label="Top company" value={companyLeaderboard(postings)[0]?.company ?? "—"} />
      </div>
      <div className="card">
        <h3>Craft mix</h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={craftMix}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="craft" angle={-30} textAnchor="end" height={70} />
            <YAxis /><Tooltip />
            <Bar dataKey="count" fill="#4c6ef5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3>Modality split</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={modalityMix}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="modality" /><YAxis /><Tooltip />
            <Bar dataKey="count" fill="#12b886" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="kpi"><div className="value">{value}</div><div className="label">{label}</div></div>;
}

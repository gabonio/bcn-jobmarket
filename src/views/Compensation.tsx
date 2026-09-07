import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting, FX } from "../data/types";
import { compBy, MIN_N } from "../data/aggregate";
import { eurK } from "../format";
import { JobPostsDialog } from "../components/JobPostsDialog";

type Dim = "craft" | "levelFamily" | "modality";

export function Compensation({ postings }: { postings: Posting[] }) {
  const [dim, setDim] = useState<Dim>("craft");
  const [selected, setSelected] = useState<string | null>(null);
  const stats = useMemo(() => compBy(postings, dim), [postings, dim]);
  // Represent range as a stacked bar: base = p25 (transparent), band = p75-p25.
  const data = useMemo(
    () =>
      stats.map((d) => ({
        key: d.key + (d.n < MIN_N ? " *" : ""),
        dimensionValue: d.key,
        base: d.p25, band: Math.max(0, d.p75 - d.p25),
        median: d.median, low: d.low, high: d.high, n: d.n,
      })),
    [stats]
  );
  const selectedPostings = selected
    ? postings.filter((p) => String(p[dim]) === selected && p.midEur != null)
    : [];

  function selectCompensation(entry: any) {
    const value = entry?.payload?.dimensionValue ?? entry?.dimensionValue;
    if (typeof value === "string") setSelected(value);
  }

  return (
    <div>
      <div className="card">
        <h3>Compensation range (p25–p75, median in tooltip) by{" "}
          <select value={dim} onChange={(e) => setDim(e.target.value as Dim)}>
            <option value="craft">Craft</option>
            <option value="levelFamily">Level family</option>
            <option value="modality">Modality</option>
          </select>
        </h3>
        <p className="muted">
          EUR-normalized. USD×{FX.USD}, GBP×{FX.GBP}. Bars marked * have fewer than {MIN_N} samples.
        </p>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart data={data} layout="vertical" margin={{ left: 80 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" tickFormatter={(v) => eurK(v as number)} />
            <YAxis type="category" dataKey="key" width={110} />
            <Tooltip content={<RangeTooltip />} />
            <Bar className="clickable-chart" dataKey="base" stackId="a" fill="transparent" onClick={selectCompensation} />
            <Bar className="clickable-chart" dataKey="band" stackId="a" fill="#4c6ef5" onClick={selectCompensation} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selected && (
        <JobPostsDialog
          title={`Job posts · ${selected}`}
          description={`${selectedPostings.length} compensation postings make up this selection.`}
          postings={selectedPostings}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function RangeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="chart-tooltip">
      <strong>{d.key}</strong>
      <div>median {eurK(d.median)}</div>
      <div>p25 {eurK(d.base)} – p75 {eurK(d.base + d.band)}</div>
      <div>range {eurK(d.low)} – {eurK(d.high)}</div>
      <div>n = {d.n}</div>
    </div>
  );
}

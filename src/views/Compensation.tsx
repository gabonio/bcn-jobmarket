import { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Posting, FX } from "../data/types";
import { compBy, MIN_N } from "../data/aggregate";
import { eurK } from "../format";

type Dim = "craft" | "levelFamily" | "modality";

export function Compensation({ postings }: { postings: Posting[] }) {
  const [dim, setDim] = useState<Dim>("craft");
  const stats = useMemo(() => compBy(postings, dim), [postings, dim]);
  // Represent range as a stacked bar: base = p25 (transparent), band = p75-p25.
  const data = useMemo(
    () =>
      stats.map((d) => ({
        key: d.key + (d.n < MIN_N ? " *" : ""),
        base: d.p25, band: Math.max(0, d.p75 - d.p25),
        median: d.median, low: d.low, high: d.high, n: d.n,
      })),
    [stats]
  );

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
            <Bar dataKey="base" stackId="a" fill="transparent" />
            <Bar dataKey="band" stackId="a" fill="#4c6ef5" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RangeTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="card" style={{ margin: 0 }}>
      <strong>{d.key}</strong>
      <div>median {eurK(d.median)}</div>
      <div>p25 {eurK(d.base)} – p75 {eurK(d.base + d.band)}</div>
      <div>range {eurK(d.low)} – {eurK(d.high)}</div>
      <div>n = {d.n}</div>
    </div>
  );
}

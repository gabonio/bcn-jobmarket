import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useState } from "react";
import { Posting } from "../data/types";
import { companyLeaderboard, compBy, countBy, distinct, DimStat, percentiles } from "../data/aggregate";
import { eurK } from "../format";
import { JobPostsDialog } from "../components/JobPostsDialog";
import { axisHeightForLabels, WrappedAxisTick } from "../components/WrappedAxisTick";

type ChartSelection = { dimension: "craft" | "modality"; value: string };

export function Overview({ postings }: { postings: Posting[] }) {
  const [selection, setSelection] = useState<ChartSelection | null>(null);
  const companies = distinct(postings, (p) => p.company).length;
  const crafts = distinct(postings, (p) => p.craft).length;
  const mids = postings.map((p) => p.midEur).filter((v): v is number => v != null);
  const medianComp = mids.length ? percentiles(mids, [50])[0] : null;
  const craftMix = countBy(postings, "craft")
    .map((r) => ({ craft: r.key, count: r.count }));
  const modalityMix = countBy(postings, "modality")
    .map((r) => ({ modality: r.key, count: r.count }));
  const craftSalary = new Map(compBy(postings, "craft").map((r) => [r.key, r]));
  const modalitySalary = new Map(compBy(postings, "modality").map((r) => [r.key, r]));
  const craftAxisHeight = axisHeightForLabels(craftMix.map((r) => r.craft));
  const craftChartHeight = 210 + craftAxisHeight;
  const selectedPostings = selection
    ? postings.filter((p) => p[selection.dimension] === selection.value)
    : [];

  function selectChartValue(entry: any, dimension: ChartSelection["dimension"]) {
    const value = entry?.payload?.[dimension] ?? entry?.[dimension];
    if (typeof value === "string") setSelection({ dimension, value });
  }

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
        <ResponsiveContainer width="100%" height={craftChartHeight}>
          <BarChart data={craftMix}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="craft"
              interval={0}
              height={craftAxisHeight}
              tick={<WrappedAxisTick />}
            />
            <YAxis /><Tooltip content={<CraftMixTooltip stats={craftSalary} />} />
            <Bar className="clickable-chart" dataKey="count" fill="#4c6ef5" onClick={(entry) => selectChartValue(entry, "craft")} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card">
        <h3>Modality split</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={modalityMix}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="modality" /><YAxis /><Tooltip content={<ModalityTooltip stats={modalitySalary} />} />
            <Bar className="clickable-chart" dataKey="count" fill="#12b886" onClick={(entry) => selectChartValue(entry, "modality")} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {selection && (
        <JobPostsDialog
          title={`Job posts · ${selection.value}`}
          description={`${selectedPostings.length} postings make up this selection.`}
          postings={selectedPostings}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}

function CraftMixTooltip({ active, payload, stats }: { active?: boolean; payload?: any[]; stats: Map<string, DimStat> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const stat = stats.get(row.craft);
  return (
    <div className="chart-tooltip">
      <strong>{row.craft}</strong>
      <div>postings {row.count}</div>
      {stat && (
        <>
          <div>lowest {eurK(stat.low)}</div>
          <div>median {eurK(stat.median)}</div>
          <div>highest {eurK(stat.high)}</div>
        </>
      )}
    </div>
  );
}

function ModalityTooltip({ active, payload, stats }: { active?: boolean; payload?: any[]; stats: Map<string, DimStat> }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const stat = stats.get(row.modality);
  return (
    <div className="chart-tooltip">
      <strong>{row.modality}</strong>
      <div>postings {row.count}</div>
      {stat && <div>median {eurK(stat.median)}</div>}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return <div className="kpi"><div className="value">{value}</div><div className="label">{label}</div></div>;
}

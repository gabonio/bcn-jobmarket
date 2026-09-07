import { useMemo, useState } from "react";
import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Posting } from "../data/types";
import { buildCandleData, buildVolumeData, colorForYear } from "./candleData";
import { CandleChart } from "../components/CandleChart";
import { MIN_N } from "../data/aggregate";
import { JobPostsDialog } from "../components/JobPostsDialog";
import { monthYear } from "../format";
import { TOOLTIP_CONTENT_STYLE, TOOLTIP_ITEM_STYLE, TOOLTIP_LABEL_STYLE } from "../chartTheme";

export function CompVolume({ postings }: { postings: Posting[] }) {
  const [selectedVolume, setSelectedVolume] = useState<{ month: number; year: number } | null>(null);
  const candle = buildCandleData(postings);
  const vol = buildVolumeData(postings);
  const selectedPostings = useMemo(
    () => selectedVolume
      ? postings.filter((p) => p.year === selectedVolume.year && p.month === selectedVolume.month)
      : [],
    [postings, selectedVolume]
  );

  function selectVolume(entry: any, year: number) {
    const row = entry?.payload ?? entry;
    const month = row?.month;
    const count = row?.[`y${year}`];
    if (typeof month === "number" && typeof count === "number" && count > 0) {
      setSelectedVolume({ month, year });
    }
  }
  return (
    <div>
      <div className="card">
        <h3>Compensation by month</h3>
        <p className="muted">
          Candles dodged and colored by year. Months with no data are blank.
          Faded/dashed candles have fewer than {MIN_N} samples.
        </p>
        <CandleChart rows={candle.rows} years={candle.years} postings={postings} />
      </div>
      <div className="card">
        <h3>Positions posted by month</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={vol.rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" /><YAxis allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_CONTENT_STYLE} labelStyle={TOOLTIP_LABEL_STYLE} itemStyle={TOOLTIP_ITEM_STYLE} />
            <Legend />
            {vol.years.map((y) => (
              <Bar className="clickable-chart" key={y} dataKey={`y${y}`} name={String(y)} fill={colorForYear(y)} onClick={(entry) => selectVolume(entry, y)} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {selectedVolume && (
        <JobPostsDialog
          title={`Job posts · ${monthYear(selectedVolume.year, selectedVolume.month)}`}
          description={`${selectedPostings.length} postings make up this selection.`}
          postings={selectedPostings}
          onClose={() => setSelectedVolume(null)}
        />
      )}
    </div>
  );
}

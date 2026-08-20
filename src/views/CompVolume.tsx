import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { Posting } from "../data/types";
import { buildCandleData, buildVolumeData, colorForYear } from "./candleData";
import { CandleChart } from "../components/CandleChart";

export function CompVolume({ postings }: { postings: Posting[] }) {
  const candle = buildCandleData(postings);
  const vol = buildVolumeData(postings);
  return (
    <div>
      <div className="card">
        <h3>Compensation by month (median comp; box = p25–p75; wick = low–high)</h3>
        <p className="muted">Candles dodged and colored by year. Months with no data are blank.</p>
        <CandleChart rows={candle.rows} years={candle.years} />
      </div>
      <div className="card">
        <h3>Positions posted by month</h3>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={vol.rows}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="monthLabel" /><YAxis allowDecimals={false} /><Tooltip /><Legend />
            {vol.years.map((y) => (
              <Bar key={y} dataKey={`y${y}`} name={String(y)} fill={colorForYear(y)} />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

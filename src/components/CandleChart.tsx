import {
  ComposedChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Legend,
} from "recharts";
import { CandleRow, colorForYear } from "../views/candleData";
import { eurK } from "../format";

interface Props { rows: CandleRow[]; years: number[]; }

// Custom shape: draw a candle from the row payload for a given year.
// Recharts computes `background` for every bar rect as the full plotting area
// ({ y: yAxis.y, height: yAxis.height }); we inject the y-domain so the shape
// can map a comp value -> pixel independently of the bar's own dataKey scaling.
function makeCandle(year: number) {
  return (props: any) => {
    const { x, width, background, payload } = props;
    const color = colorForYear(year);
    const low = payload[`y${year}_low`];
    const high = payload[`y${year}_high`];
    const p25 = payload[`y${year}_p25`];
    const p75 = payload[`y${year}_p75`];
    const median = payload[`y${year}_median`];
    if (high == null) return <g />;
    const { y: ay, height: ah, domainMin, domainMax } = background as any;
    const scale = (v: number) => ay + ah * (1 - (v - domainMin) / (domainMax - domainMin));
    const cx = x + width / 2;
    const boxTop = scale(p75), boxBottom = scale(p25);
    return (
      <g>
        <line x1={cx} x2={cx} y1={scale(high)} y2={scale(low)} stroke={color} strokeWidth={1.5} />
        <rect
          x={x + width * 0.15} width={width * 0.7} y={boxTop} height={Math.max(1, boxBottom - boxTop)}
          fill={color} fillOpacity={0.35} stroke={color}
        />
        <line x1={x + width * 0.15} x2={x + width * 0.85} y1={scale(median)} y2={scale(median)} stroke={color} strokeWidth={2} />
      </g>
    );
  };
}

export function CandleChart({ rows, years }: Props) {
  const allVals: number[] = [];
  rows.forEach((r) => years.forEach((y) => {
    [r[`y${y}_low`], r[`y${y}_high`]].forEach((v) => typeof v === "number" && allVals.push(v));
  }));
  const domainMin = allVals.length ? Math.min(...allVals) * 0.95 : 0;
  const domainMax = allVals.length ? Math.max(...allVals) * 1.05 : 1;

  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={rows} barCategoryGap="20%">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="monthLabel" />
        <YAxis
          domain={[domainMin, domainMax]}
          allowDataOverflow
          tickFormatter={(v) => eurK(v as number)}
          width={70}
        />
        <Tooltip content={<CandleTooltip years={years} />} />
        <Legend />
        {years.map((y) => (
          <Bar
            key={y}
            dataKey={`y${y}_p25`}
            name={String(y)}
            fill={colorForYear(y)}
            isAnimationActive={false}
            shape={(props: any) =>
              makeCandle(y)({ ...props, background: { ...props.background, domainMin, domainMax } })}
          />
        ))}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function CandleTooltip({ active, payload, label, years }: any) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="card" style={{ margin: 0 }}>
      <strong>{label}</strong>
      {years.map((y: number) => row[`y${y}_median`] != null && (
        <div key={y} style={{ color: colorForYear(y) }}>
          {y}: median {eurK(row[`y${y}_median`])} (p25 {eurK(row[`y${y}_p25`])}–p75 {eurK(row[`y${y}_p75`])}), n={row[`y${y}_n`]}
        </div>
      ))}
    </div>
  );
}

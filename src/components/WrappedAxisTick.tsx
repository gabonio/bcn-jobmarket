interface Props {
  x?: number;
  y?: number;
  payload?: { value?: string | number };
  maxChars?: number;
}

function wrapLabel(value: string, maxChars: number): string[] {
  const lines: string[] = [];
  let current = "";

  for (const word of value.trim().split(/\s+/).filter(Boolean)) {
    const chunks = word.match(new RegExp(`.{1,${maxChars}}`, "g")) ?? [word];
    for (const chunk of chunks) {
      if (!current) {
        current = chunk;
      } else if (current.length + 1 + chunk.length <= maxChars) {
        current += ` ${chunk}`;
      } else {
        lines.push(current);
        current = chunk;
      }
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

export function axisHeightForLabels(labels: string[], maxChars = 14): number {
  const maxLines = Math.max(1, ...labels.map((label) => wrapLabel(label, maxChars).length));
  return Math.max(86, 58 + maxLines * 18);
}

export function WrappedAxisTick({ x = 0, y = 0, payload, maxChars = 14 }: Props) {
  const lines = wrapLabel(String(payload?.value ?? ""), maxChars);
  return (
    <g transform={`translate(${x},${y + 12})`}>
      <text
        transform="rotate(-30)"
        textAnchor="end"
        fill="#667"
        fontSize={14}
      >
        {lines.map((line, index) => (
          <tspan key={`${line}-${index}`} x="0" dy={index === 0 ? 0 : 16}>
            {line}
          </tspan>
        ))}
      </text>
    </g>
  );
}

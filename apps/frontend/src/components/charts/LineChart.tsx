export interface Series {
  name: string;
  color: string;
  data: number[];
}

interface Props {
  series: Series[];
  height?: number;
  yFormat?: (v: number) => string;
}

export function LineChart({ series, height = 220, yFormat = (v) => String(Math.round(v)) }: Props) {
  const W = 800;
  const padL = 42, padR = 14, padT = 14, padB = 24;
  const allValues = series.flatMap((s) => s.data);
  const maxY = (Math.max(...allValues, 0)) * 1.1 || 1;
  const len = Math.max(...series.map((s) => s.data.length), 2);
  const stepX = (W - padL - padR) / Math.max(1, len - 1);

  const yScale = (v: number) => padT + (height - padT - padB) * (1 - v / maxY);
  const xScale = (i: number) => padL + i * stepX;

  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => (maxY / gridLines) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height}`} className="chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid" x1={padL} x2={W - padR} y1={yScale(t)} y2={yScale(t)} />
          <text className="axis" x={padL - 6} y={yScale(t) + 3} textAnchor="end">{yFormat(t)}</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const x = padL + (W - padL - padR) * p;
        return <text key={i} className="axis" x={x} y={height - 6} textAnchor="middle">t-{Math.round((1 - p) * (len - 1))}s</text>;
      })}
      {series.map((s, idx) => {
        if (s.data.length === 0) return null;
        const d = s.data.map((v, i) => (i === 0 ? `M${xScale(i)},${yScale(v)}` : `L${xScale(i)},${yScale(v)}`)).join(' ');
        return (
          <g key={idx}>
            <path d={d} stroke={s.color} className="line" />
            <circle cx={xScale(s.data.length - 1)} cy={yScale(s.data[s.data.length - 1])} r="2.5" fill={s.color} />
          </g>
        );
      })}
    </svg>
  );
}

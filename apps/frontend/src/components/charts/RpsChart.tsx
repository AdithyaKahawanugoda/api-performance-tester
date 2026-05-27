import type { MetricsWindow } from '@api-perf/shared';

interface Props {
  data: MetricsWindow[];
  height?: number;
}

export function RpsChart({ data, height = 200 }: Props) {
  const W = 800;
  const padL = 42, padR = 14, padT = 14, padB = 24;
  const values = data.map((w) => Math.round(w.rps * 10) / 10);
  const maxY = (Math.max(...values, 0)) * 1.1 || 1;
  const len = Math.max(values.length, 2);
  const stepX = (W - padL - padR) / Math.max(1, len - 1);

  const yScale = (v: number) => padT + (height - padT - padB) * (1 - v / maxY);
  const xScale = (i: number) => padL + i * stepX;

  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => (maxY / gridLines) * i);

  const d = values.length > 0
    ? values.map((v, i) => (i === 0 ? `M${xScale(i)},${yScale(v)}` : `L${xScale(i)},${yScale(v)}`)).join(' ')
    : '';

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${height}`} className="chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid" x1={padL} x2={W - padR} y1={yScale(t)} y2={yScale(t)} />
          <text className="axis" x={padL - 6} y={yScale(t) + 3} textAnchor="end">{Math.round(t)}</text>
        </g>
      ))}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const x = padL + (W - padL - padR) * p;
        return <text key={i} className="axis" x={x} y={height - 6} textAnchor="middle">t-{Math.round((1 - p) * (len - 1))}s</text>;
      })}
      {d && <path d={d} stroke="var(--accent)" className="line" />}
      {values.length > 0 && (
        <circle
          cx={xScale(values.length - 1)}
          cy={yScale(values[values.length - 1])}
          r="2.5"
          fill="var(--accent)"
        />
      )}
    </svg>
  );
}

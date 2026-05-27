import type { TestRun } from '@api-perf/shared';

interface Props {
  runs: TestRun[];
  height?: number;
}

const RUN_COLORS = ['var(--accent)', 'var(--info)', 'var(--ok)', 'var(--warn)'];

export function ComparisonBarChart({ runs, height = 220 }: Props) {
  const W = 800;
  const padL = 44, padR = 14, padT = 14, padB = 28;

  const groups = ['avg', 'p50', 'p95', 'p99'];
  const series = runs.map((run, i) => ({
    id: run.id,
    name: run.config.name.length > 14 ? run.config.name.slice(0, 13) + '…' : run.config.name,
    color: RUN_COLORS[i % RUN_COLORS.length],
    values: [
      run.metrics?.avgLatency ?? 0,
      run.metrics?.p50 ?? 0,
      run.metrics?.p95 ?? 0,
      run.metrics?.p99 ?? 0,
    ],
  }));

  const max = Math.max(...series.flatMap((s) => s.values), 1) * 1.15;
  const groupW = (W - padL - padR) / groups.length;
  const barW = (groupW - 12) / Math.max(series.length, 1);
  const yScale = (v: number) => padT + (height - padT - padB) * (1 - v / max);
  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => (max / gridLines) * i);

  return (
    <div className="stack-sm">
      <svg width="100%" viewBox={`0 0 ${W} ${height}`} className="chart">
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="grid" x1={padL} x2={W - padR} y1={yScale(t)} y2={yScale(t)} />
            <text className="axis" x={padL - 6} y={yScale(t) + 3} textAnchor="end">{Math.round(t)}ms</text>
          </g>
        ))}
        {groups.map((g, gi) => {
          const groupX = padL + gi * groupW + 6;
          return (
            <g key={gi}>
              <text className="axis" x={groupX + (groupW - 12) / 2} y={height - 8} textAnchor="middle" fill="var(--fg-1)">{g.toUpperCase()}</text>
              {series.map((s, si) => {
                const v = s.values[gi];
                const x = groupX + si * barW;
                const y = yScale(v);
                const h = height - padB - y;
                return (
                  <g key={si}>
                    <rect x={x + 1} y={y} width={barW - 2} height={h} fill={s.color} rx="1" opacity="0.85" />
                    <text className="axis" x={x + barW / 2} y={y - 4} textAnchor="middle" fill="var(--fg-1)">
                      {Math.round(v)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="legend">
        {series.map((s) => (
          <span key={s.id}>
            <span className="legend__swatch" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

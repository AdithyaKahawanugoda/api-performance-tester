import type { MetricsWindow } from '@api-perf/shared';
import { LineChart } from './LineChart';

interface Props {
  data: MetricsWindow[];
}

const SERIES = [
  { name: 'p50', color: 'var(--accent)' },
  { name: 'p95', color: 'var(--info)' },
  { name: 'p99', color: 'var(--warn)' },
] as const;

export function LatencyLineChart({ data }: Props) {
  const series = [
    { name: 'p50', color: 'var(--accent)', data: data.map((w) => Math.round(w.p50)) },
    { name: 'p95', color: 'var(--info)',   data: data.map((w) => Math.round(w.p95)) },
    { name: 'p99', color: 'var(--warn)',   data: data.map((w) => Math.round(w.p99)) },
  ];

  return (
    <div className="stack-sm">
      <LineChart series={series} yFormat={(v) => `${Math.round(v)}ms`} />
      <div className="legend">
        {SERIES.map((s) => (
          <span key={s.name}>
            <span className="legend__swatch" style={{ background: s.color }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

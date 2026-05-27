import type { MetricsWindow } from '@api-perf/shared';
import { LineChart } from './LineChart';

interface Props {
  data: MetricsWindow[];
  height?: number;
}

export function RpsChart({ data, height = 200 }: Props) {
  const series = [{ name: 'rps', color: 'var(--accent)', data: data.map((w) => Math.round(w.rps * 10) / 10) }];
  return <LineChart series={series} height={height} />;
}

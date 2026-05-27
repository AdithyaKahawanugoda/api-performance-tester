import type { MetricsWindow } from '@api-perf/shared';
import { LineChart } from './LineChart';

interface Props {
  data: MetricsWindow[];
  height?: number;
}

export function ErrorRateChart({ data, height = 200 }: Props) {
  const series = [{
    name: 'error%',
    color: 'var(--err)',
    data: data.map((w) => {
      const total = w.requestsInWindow;
      return total > 0 ? Math.round((w.failureInWindow / total) * 10000) / 100 : 0;
    }),
  }];
  return <LineChart series={series} height={height} yFormat={(v) => `${v.toFixed(1)}%`} />;
}

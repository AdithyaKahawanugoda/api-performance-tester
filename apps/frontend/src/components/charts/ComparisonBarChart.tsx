'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { TestRun } from '@api-perf/shared';
import { formatLatency } from '@/lib/formatters';

interface Props {
  runs: TestRun[];
  height?: number;
}

const COLORS = ['#3b82f6', '#f59e0b', '#22c55e', '#ef4444'];

export function ComparisonBarChart({ runs, height = 300 }: Props) {
  const metrics = ['avgLatency', 'p50', 'p95', 'p99'] as const;

  const data = metrics.map((metric) => {
    const entry: Record<string, string | number> = { metric: metric.toUpperCase() };
    runs.forEach((run, idx) => {
      const label = run.config.name.slice(0, 12);
      entry[label] = run.metrics?.[metric] ?? 0;
    });
    return entry;
  });

  const labels = runs.map((r) => r.config.name.slice(0, 12));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="metric" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis unit="ms" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6 }}
          formatter={(v: number) => [formatLatency(v)]}
        />
        <Legend />
        {labels.map((label, idx) => (
          <Bar key={label} dataKey={label} fill={COLORS[idx % COLORS.length]} radius={[4, 4, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

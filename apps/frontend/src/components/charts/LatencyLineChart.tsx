'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { MetricsWindow } from '@api-perf/shared';

interface Props {
  data: MetricsWindow[];
  height?: number;
}

export function LatencyLineChart({ data, height = 280 }: Props) {
  const chartData = data.map((w) => ({
    time: new Date(w.windowEndMs).toLocaleTimeString('en', { hour12: false }),
    p50: Math.round(w.p50),
    p95: Math.round(w.p95),
    p99: Math.round(w.p99),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis unit="ms" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6 }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
          formatter={(v: number) => [`${v}ms`]}
        />
        <Legend />
        <Line type="monotone" dataKey="p50" name="p50" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line type="monotone" dataKey="p95" name="p95" stroke="#f59e0b" dot={false} strokeWidth={2} isAnimationActive={false} />
        <Line type="monotone" dataKey="p99" name="p99" stroke="#ef4444" dot={false} strokeWidth={2} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

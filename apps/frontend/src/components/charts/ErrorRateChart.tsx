'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { MetricsWindow } from '@api-perf/shared';

interface Props {
  data: MetricsWindow[];
  height?: number;
}

export function ErrorRateChart({ data, height = 200 }: Props) {
  const chartData = data.map((w) => {
    const total = w.requestsInWindow;
    const errorRate = total > 0 ? (w.failureInWindow / total) * 100 : 0;
    return {
      time: new Date(w.windowEndMs).toLocaleTimeString('en', { hour12: false }),
      errorRate: Math.round(errorRate * 100) / 100,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="errGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis unit="%" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6 }}
          formatter={(v: number) => [`${v}%`]}
        />
        <Area type="monotone" dataKey="errorRate" name="Error Rate" stroke="#ef4444" fill="url(#errGradient)" strokeWidth={2} dot={false} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

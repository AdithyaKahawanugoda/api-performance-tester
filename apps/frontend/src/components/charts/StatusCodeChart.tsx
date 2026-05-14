'use client';

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Props {
  distribution: Record<string, number>;
  height?: number;
}

function getColor(code: string): string {
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300) return '#22c55e';
  if (n >= 300 && n < 400) return '#3b82f6';
  if (n >= 400 && n < 500) return '#f59e0b';
  if (n >= 500) return '#ef4444';
  return '#6b7280';
}

export function StatusCodeChart({ distribution, height = 250 }: Props) {
  const data = Object.entries(distribution).map(([code, count]) => ({
    name: code,
    value: count,
    color: getColor(code),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 6 }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

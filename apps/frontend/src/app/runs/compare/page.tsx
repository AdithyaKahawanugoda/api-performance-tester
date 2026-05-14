'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useCompareRuns } from '@/hooks/useRuns';
import { formatLatency, formatRps, formatErrorRate } from '@/lib/formatters';

export default function ComparePage() {
  const [idInput, setIdInput] = useState('');
  const [ids, setIds] = useState<string[]>([]);

  const { data: runs, isLoading } = useCompareRuns(ids);

  function handleCompare() {
    const parsed = idInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (parsed.length >= 2) setIds(parsed);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="Compare Runs" />

      <div className="flex gap-2">
        <Input
          placeholder="Paste 2-4 run IDs separated by commas..."
          value={idInput}
          onChange={(e) => setIdInput(e.target.value)}
          className="max-w-2xl"
        />
        <Button onClick={handleCompare} disabled={isLoading}>Compare</Button>
      </div>

      {isLoading && <Skeleton className="h-80 w-full" />}

      {runs && runs.length >= 2 && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base">Latency Comparison</CardTitle></CardHeader>
            <CardContent><ComparisonBarChart runs={runs} /></CardContent>
          </Card>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-3 pr-6">Metric</th>
                  {runs.map((r) => <th key={r.id} className="pb-3 pr-6">{r.config.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Total Requests', key: 'totalRequests' as const, fmt: (v: number) => v.toLocaleString() },
                  { label: 'Avg Latency', key: 'avgLatency' as const, fmt: formatLatency },
                  { label: 'p50', key: 'p50' as const, fmt: formatLatency },
                  { label: 'p95', key: 'p95' as const, fmt: formatLatency },
                  { label: 'p99', key: 'p99' as const, fmt: formatLatency },
                  { label: 'Avg RPS', key: 'rps' as const, fmt: formatRps },
                  { label: 'Error Rate', key: 'errorRate' as const, fmt: formatErrorRate },
                ].map(({ label, key, fmt }) => (
                  <tr key={label} className="border-b">
                    <td className="py-2 pr-6 font-medium">{label}</td>
                    {runs.map((r) => (
                      <td key={r.id} className="py-2 pr-6 tabular-nums">
                        {r.metrics ? fmt(r.metrics[key] as number) : '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

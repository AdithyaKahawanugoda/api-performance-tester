'use client';

import Link from 'next/link';
import { Header } from '@/components/layout/Header';
import { RunStatusBadge } from '@/components/runs/RunStatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/EmptyState';
import { useRuns } from '@/hooks/useRuns';
import { formatRelativeTime, formatLatency, formatRps, formatErrorRate } from '@/lib/formatters';

export default function RunsPage() {
  const { data, isLoading } = useRuns();
  const runs = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="Test Runs" />

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : runs.length === 0 ? (
        <EmptyState
          title="No runs yet"
          description="Create a configuration and run a test to see results here."
          action={<Link href="/configs"><button className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground">View Configs</button></Link>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-6 py-3">Config</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Requests</th>
                    <th className="px-6 py-3">Avg Latency</th>
                    <th className="px-6 py-3">RPS</th>
                    <th className="px-6 py-3">Errors</th>
                    <th className="px-6 py-3">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id} className="border-b hover:bg-muted/30">
                      <td className="px-6 py-3">
                        <Link href={`/runs/${run.id}`} className="font-medium hover:underline">
                          {run.config.name}
                        </Link>
                      </td>
                      <td className="px-6 py-3"><RunStatusBadge status={run.status} /></td>
                      <td className="px-6 py-3 tabular-nums">{run.metrics?.totalRequests.toLocaleString() ?? '—'}</td>
                      <td className="px-6 py-3 tabular-nums">{run.metrics ? formatLatency(run.metrics.avgLatency) : '—'}</td>
                      <td className="px-6 py-3 tabular-nums">{run.metrics ? formatRps(run.metrics.rps) : '—'}</td>
                      <td className="px-6 py-3 tabular-nums">{run.metrics ? formatErrorRate(run.metrics.errorRate) : '—'}</td>
                      <td className="px-6 py-3 text-muted-foreground">{run.createdAt ? formatRelativeTime(run.createdAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Activity, CheckCircle, Clock, Zap } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { StatsCard } from '@/components/dashboard/StatsCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RunStatusBadge } from '@/components/runs/RunStatusBadge';
import { useRuns } from '@/hooks/useRuns';
import { formatRelativeTime, formatLatency, formatRps } from '@/lib/formatters';
import { EmptyState } from '@/components/shared/EmptyState';

export default function DashboardPage() {
  const { data: runsData, isLoading } = useRuns({ page: 1 });
  const runs = runsData?.items ?? [];

  const completedRuns = runs.filter((r) => r.status === 'completed');
  const avgLatency = completedRuns.length > 0
    ? completedRuns.reduce((s, r) => s + (r.metrics?.avgLatency ?? 0), 0) / completedRuns.length
    : 0;
  const avgRps = completedRuns.length > 0
    ? completedRuns.reduce((s, r) => s + (r.metrics?.rps ?? 0), 0) / completedRuns.length
    : 0;
  const successRate = completedRuns.length > 0
    ? completedRuns.reduce((s, r) => s + (1 - (r.metrics?.errorRate ?? 0)), 0) / completedRuns.length
    : 1;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="Dashboard" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatsCard title="Total Runs" value={String(runsData?.total ?? 0)} icon={<Activity className="h-4 w-4" />} loading={isLoading} />
        <StatsCard title="Avg Latency" value={formatLatency(avgLatency)} icon={<Clock className="h-4 w-4" />} loading={isLoading} />
        <StatsCard title="Avg RPS" value={formatRps(avgRps)} icon={<Zap className="h-4 w-4" />} loading={isLoading} />
        <StatsCard title="Success Rate" value={`${(successRate * 100).toFixed(1)}%`} icon={<CheckCircle className="h-4 w-4" />} loading={isLoading} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Runs</CardTitle>
          <Link href="/runs">
            <Button variant="ghost" size="sm">View all</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {runs.length === 0 && !isLoading ? (
            <EmptyState
              title="No test runs yet"
              description="Create a test configuration and run your first load test."
              action={
                <Link href="/configs/new">
                  <Button>Create First Config</Button>
                </Link>
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Config</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3 pr-4">Avg Latency</th>
                    <th className="pb-3 pr-4">RPS</th>
                    <th className="pb-3">Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 8).map((run) => (
                    <tr key={run.id} className="border-b hover:bg-muted/30">
                      <td className="py-3 pr-4">
                        <Link href={`/runs/${run.id}`} className="font-medium hover:underline">
                          {run.config.name}
                        </Link>
                      </td>
                      <td className="py-3 pr-4"><RunStatusBadge status={run.status} /></td>
                      <td className="py-3 pr-4 tabular-nums">{run.metrics ? formatLatency(run.metrics.avgLatency) : '—'}</td>
                      <td className="py-3 pr-4 tabular-nums">{run.metrics ? formatRps(run.metrics.rps) : '—'}</td>
                      <td className="py-3 text-muted-foreground">{run.createdAt ? formatRelativeTime(run.createdAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

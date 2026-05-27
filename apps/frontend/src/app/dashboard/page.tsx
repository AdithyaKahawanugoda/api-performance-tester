'use client';

import Link from 'next/link';
import { PageHead } from '@/components/shared/PageHead';
import { EmptyState } from '@/components/shared/EmptyState';
import { KPI } from '@/components/ui/KPI';
import { Icon } from '@/components/ui/Icon';
import { RunStatus } from '@/components/runs/RunStatus';
import { useRuns } from '@/hooks/useRuns';
import { formatRelativeTime, formatLatency, formatRps } from '@/lib/formatters';

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
    <div className="page">
      <PageHead
        title="Dashboard"
        sub="Overview of your API performance tests"
        actions={
          <Link href="/configs/new" className="btn btn--primary">
            <Icon name="plus" size={13} />
            New test
          </Link>
        }
      />

      <div className="stack-lg">
        <div className="grid-4">
          <KPI label="Total Runs"    value={isLoading ? '—' : (runsData?.total ?? 0)} />
          <KPI label="Avg Latency"   value={isLoading ? '—' : formatLatency(avgLatency)} />
          <KPI label="Avg RPS"       value={isLoading ? '—' : formatRps(avgRps)} />
          <KPI label="Success Rate"  value={isLoading ? '—' : `${(successRate * 100).toFixed(1)}%`} />
        </div>

        <div className="card">
          <div className="card__head">
            <div>
              <div className="card__title">Recent Runs</div>
            </div>
            <Link href="/runs" className="btn btn--ghost btn--sm">View all</Link>
          </div>
          <div className="card__body--flush">
            {runs.length === 0 && !isLoading ? (
              <div style={{ padding: 24 }}>
                <EmptyState
                  title="No test runs yet"
                  description="Create a test configuration and run your first load test."
                  action={
                    <Link href="/configs/new" className="btn btn--primary">
                      Create First Config
                    </Link>
                  }
                />
              </div>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Config</th>
                    <th>Status</th>
                    <th>Avg Latency</th>
                    <th>RPS</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.slice(0, 8).map((run) => (
                    <tr key={run.id}>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ color: 'var(--fg-0)', fontWeight: 500 }}>
                          {run.config.name}
                        </Link>
                      </td>
                      <td><RunStatus status={run.status} /></td>
                      <td className="num">{run.metrics ? formatLatency(run.metrics.avgLatency) : '—'}</td>
                      <td className="num">{run.metrics ? formatRps(run.metrics.rps) : '—'}</td>
                      <td className="dim">{run.createdAt ? formatRelativeTime(run.createdAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

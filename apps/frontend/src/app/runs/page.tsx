'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHead } from '@/components/shared/PageHead';
import { EmptyState } from '@/components/shared/EmptyState';
import { RunStatus } from '@/components/runs/RunStatus';
import { Icon } from '@/components/ui/Icon';
import { useRuns } from '@/hooks/useRuns';
import { formatRelativeTime, formatLatency, formatRps, formatErrorRate } from '@/lib/formatters';

const STATUS_FILTERS = ['all', 'running', 'queued', 'completed', 'failed'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function RunsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const { data, isLoading } = useRuns(statusFilter !== 'all' ? { status: statusFilter } : undefined);
  const runs = data?.items ?? [];

  return (
    <div className="page">
      <PageHead
        title="Test Runs"
        sub={data ? `${data.total} run${data.total !== 1 ? 's' : ''}` : undefined}
        actions={
          <Link href="/runs/compare" className="btn">
            <Icon name="cmp" size={13} />
            Compare
          </Link>
        }
      />

      <div className="stack-lg">
        <div style={{ display: 'flex', gap: 4 }}>
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              className={'btn btn--ghost btn--sm ' + (statusFilter === f ? 'btn--active' : '')}
              onClick={() => setStatusFilter(f)}
              disabled={isLoading}
              style={{ textTransform: 'capitalize' }}
            >
              {f}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="card">
            <div className="card__body--flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Config</th><th>Status</th><th>Requests</th>
                    <th>Avg</th><th>p50</th><th>p95</th><th>p99</th>
                    <th>RPS</th><th>Errors</th><th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="shimmer" style={{ height: 14, width: '50%', borderRadius: 3 }} /></td>
                      <td><div className="shimmer" style={{ height: 18, width: 68, borderRadius: 3 }} /></td>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td key={j}><div className="shimmer" style={{ height: 14, width: 44, borderRadius: 3 }} /></td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : runs.length === 0 ? (
          <EmptyState
            title="No runs found"
            description={statusFilter !== 'all' ? `No ${statusFilter} runs.` : 'Create a configuration and run a test to see results here.'}
            action={
              statusFilter === 'all' ? (
                <Link href="/configs" className="btn btn--primary">View Configs</Link>
              ) : undefined
            }
          />
        ) : (
          <div className="card">
            <div className="card__body--flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Config</th>
                    <th>Status</th>
                    <th>Requests</th>
                    <th>Avg</th>
                    <th>p50</th>
                    <th>p95</th>
                    <th>p99</th>
                    <th>RPS</th>
                    <th>Errors</th>
                    <th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((run) => (
                    <tr key={run.id}>
                      <td>
                        <Link href={`/runs/${run.id}`} style={{ color: 'var(--fg-0)', fontWeight: 500 }}>
                          {run.config.name}
                        </Link>
                      </td>
                      <td><RunStatus status={run.status} /></td>
                      <td className="num">{run.metrics?.totalRequests.toLocaleString() ?? '—'}</td>
                      <td className="num">{run.metrics ? formatLatency(run.metrics.avgLatency) : '—'}</td>
                      <td className="num">{run.metrics ? formatLatency(run.metrics.p50) : '—'}</td>
                      <td className="num">{run.metrics ? formatLatency(run.metrics.p95) : '—'}</td>
                      <td className="num">{run.metrics ? formatLatency(run.metrics.p99) : '—'}</td>
                      <td className="num">{run.metrics ? formatRps(run.metrics.rps) : '—'}</td>
                      <td className="num">{run.metrics ? formatErrorRate(run.metrics.errorRate) : '—'}</td>
                      <td className="dim">{run.createdAt ? formatRelativeTime(run.createdAt) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

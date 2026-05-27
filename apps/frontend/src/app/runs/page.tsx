'use client';

import Link from 'next/link';
import { useState, useCallback } from 'react';
import { PageHead } from '@/components/shared/PageHead';
import { EmptyState } from '@/components/shared/EmptyState';
import { RunStatus } from '@/components/runs/RunStatus';
import { Icon } from '@/components/ui/Icon';
import { useRuns, useDeleteRuns } from '@/hooks/useRuns';
import { formatRelativeTime, formatLatency, formatRps, formatErrorRate } from '@/lib/formatters';

const STATUS_FILTERS = ['all', 'running', 'queued', 'completed', 'failed'] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

export default function RunsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data, isLoading } = useRuns(statusFilter !== 'all' ? { status: statusFilter } : undefined);
  const deleteRuns = useDeleteRuns();
  const runs = data?.items ?? [];

  const selectableRuns = runs.filter((r) => r.status !== 'running' && r.status !== 'queued');
  const allSelected = selectableRuns.length > 0 && selectableRuns.every((r) => selectedIds.has(r.id));
  const someSelected = selectableRuns.some((r) => selectedIds.has(r.id));

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableRuns.map((r) => r.id)));
    }
  }, [allSelected, selectableRuns]);

  const toggleOne = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    deleteRuns.mutate(ids, {
      onSuccess: () => setSelectedIds(new Set()),
    });
  };

  const handleFilterChange = (f: StatusFilter) => {
    setStatusFilter(f);
    setSelectedIds(new Set());
  };

  const selectedCount = selectedIds.size;
  const canCompare = selectedCount >= 2 && selectedCount <= 4;
  const compareHref = canCompare
    ? `/runs/compare?ids=${Array.from(selectedIds).join(',')}`
    : '/runs/compare';

  return (
    <div className="page">
      <PageHead
        title="Test Runs"
        sub={data ? `${data.total} run${data.total !== 1 ? 's' : ''}` : undefined}
        actions={
          <Link
            href={compareHref}
            className={'btn' + (canCompare ? ' btn--primary' : '')}
            title={!canCompare && selectedCount > 4 ? 'Select 2–4 runs to compare' : undefined}
          >
            <Icon name="cmp" size={13} />
            {canCompare ? `Compare ${selectedCount}` : 'Compare'}
          </Link>
        }
      />

      <div className="stack-lg">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUS_FILTERS.map((f) => (
              <button
                key={f}
                className={'btn btn--ghost btn--sm ' + (statusFilter === f ? 'btn--active' : '')}
                onClick={() => handleFilterChange(f)}
                disabled={isLoading}
                style={{ textTransform: 'capitalize' }}
              >
                {f}
              </button>
            ))}
          </div>

          {selectedCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
              <span style={{ fontSize: 12.5, color: 'var(--fg-2)' }}>
                {selectedCount} selected
              </span>
              <button
                className="btn btn--sm btn--ghost"
                onClick={() => setSelectedIds(new Set())}
              >
                Unselect all
              </button>
              {canCompare && (
                <Link href={compareHref} className="btn btn--sm">
                  <Icon name="cmp" size={12} />
                  Compare {selectedCount}
                </Link>
              )}
              {selectedCount > 4 && (
                <span style={{ fontSize: 12, color: 'var(--fg-3)' }}>Select 2–4 to compare</span>
              )}
              <button
                className="btn btn--sm btn--danger"
                onClick={handleBulkDelete}
                disabled={deleteRuns.isPending}
              >
                {deleteRuns.isPending ? 'Deleting…' : `Delete ${selectedCount}`}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="card">
            <div className="card__body--flush">
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 32 }} />
                    <th>Config</th><th>Status</th><th>Requests</th>
                    <th>Avg</th><th>p50</th><th>p95</th><th>p99</th>
                    <th>RPS</th><th>Errors</th><th>Started</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td><div className="shimmer" style={{ height: 14, width: 14, borderRadius: 3 }} /></td>
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
                    <th style={{ width: 32, paddingLeft: 12 }}>
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={toggleAll}
                        disabled={selectableRuns.length === 0}
                        title={allSelected ? 'Unselect all' : 'Select all'}
                        style={{ cursor: selectableRuns.length === 0 ? 'not-allowed' : 'pointer' }}
                      />
                    </th>
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
                  {runs.map((run) => {
                    const isActive = run.status === 'running' || run.status === 'queued';
                    const isSelected = selectedIds.has(run.id);
                    return (
                      <tr key={run.id} className={isSelected ? 'is-active' : ''}>
                        <td style={{ paddingLeft: 12 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(run.id)}
                            disabled={isActive}
                            title={isActive ? 'Cannot select active runs' : undefined}
                            style={{ cursor: isActive ? 'not-allowed' : 'pointer' }}
                          />
                        </td>
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
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { PageHead } from '@/components/shared/PageHead';
import { Icon } from '@/components/ui/Icon';
import { RunStatus } from '@/components/runs/RunStatus';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
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
    <div className="page">
      <PageHead title="Compare Runs" sub="Side-by-side latency and metrics comparison" />

      <div className="stack-lg">
        <div className="row">
          <input
            className="input"
            style={{ maxWidth: 520 }}
            placeholder="Paste 2–4 run IDs separated by commas…"
            value={idInput}
            onChange={(e) => setIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCompare()}
          />
          <button className="btn btn--primary" onClick={handleCompare} disabled={isLoading}>
            <Icon name="cmp" size={13} />
            Compare
          </button>
        </div>

        {isLoading && (
          <div className="card shimmer" style={{ height: 280 }} />
        )}

        {runs && runs.length >= 2 && (
          <div className="stack">
            <div className="card">
              <div className="card__head">
                <div className="card__title">Latency Comparison</div>
              </div>
              <div className="card__body">
                <ComparisonBarChart runs={runs} />
              </div>
            </div>

            <div className="card">
              <div className="card__head">
                <div className="card__title">Metrics Table</div>
              </div>
              <div className="card__body--flush">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Metric</th>
                      {runs.map((r) => <th key={r.id}>{r.config.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><span className="dim">Status</span></td>
                      {runs.map((r) => <td key={r.id}><RunStatus status={r.status} /></td>)}
                    </tr>
                    {[
                      { label: 'Total Requests', key: 'totalRequests' as const, fmt: (v: number) => v.toLocaleString() },
                      { label: 'Avg Latency',    key: 'avgLatency'    as const, fmt: formatLatency },
                      { label: 'p50',            key: 'p50'           as const, fmt: formatLatency },
                      { label: 'p95',            key: 'p95'           as const, fmt: formatLatency },
                      { label: 'p99',            key: 'p99'           as const, fmt: formatLatency },
                      { label: 'Avg RPS',        key: 'rps'           as const, fmt: formatRps },
                      { label: 'Error Rate',     key: 'errorRate'     as const, fmt: formatErrorRate },
                    ].map(({ label, key, fmt }) => (
                      <tr key={label}>
                        <td><span className="dim">{label}</span></td>
                        {runs.map((r) => (
                          <td key={r.id} className="num">
                            {r.metrics ? fmt(r.metrics[key] as number) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { RunStatus } from '@/components/runs/RunStatus';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
import { useCompareRuns } from '@/hooks/useRuns';
import { formatLatency, formatRps, formatErrorRate } from '@/lib/formatters';

const MAX_RUNS = 4;

function parseIds(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

export default function ComparePage() {
  const searchParams = useSearchParams();
  const urlIds = searchParams.get('ids') ?? '';

  const [ids, setIds] = useState<string[]>(() => {
    const parsed = parseIds(urlIds);
    return parsed.length >= 2 ? parsed.slice(0, MAX_RUNS) : [];
  });
  const [pending, setPending] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (urlIds) {
      const parsed = parseIds(urlIds);
      if (parsed.length >= 2) setIds(parsed.slice(0, MAX_RUNS));
    }
  }, [urlIds]);

  const { data: runs, isLoading } = useCompareRuns(ids);

  function getLabel(id: string) {
    return runs?.find((r) => r.id === id)?.config.name ?? `${id.slice(0, 8)}…`;
  }

  function addPending() {
    const incoming = parseIds(pending);
    if (!incoming.length) return;
    setIds((prev) => [...new Set([...prev, ...incoming])].slice(0, MAX_RUNS));
    setPending('');
  }

  function removeId(id: string) {
    setIds((prev) => prev.filter((i) => i !== id));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addPending();
    } else if (e.key === 'Backspace' && !pending && ids.length > 0) {
      setIds((prev) => prev.slice(0, -1));
    }
  }

  const atMax = ids.length >= MAX_RUNS;

  return (
    <div className="page">
      <PageHead title="Compare Runs" sub="Side-by-side latency and metrics comparison" />

      <div className="stack-lg">
        {/* Chip input area */}
        <div
          role="group"
          onClick={() => inputRef.current?.focus()}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            padding: '8px 12px',
            minHeight: 44,
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: 'var(--radius)',
            cursor: 'text',
          }}
        >
          {ids.map((id) => (
            <span
              key={id}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 6px 3px 10px',
                background: 'var(--bg-3)',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 12.5,
                fontWeight: 500,
                color: 'var(--fg-0)',
                whiteSpace: 'nowrap',
                maxWidth: 220,
                overflow: 'hidden',
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {getLabel(id)}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); removeId(id); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 16,
                  height: 16,
                  padding: 0,
                  background: 'transparent',
                  border: 'none',
                  borderRadius: 3,
                  color: 'var(--fg-2)',
                  fontSize: 14,
                  lineHeight: 1,
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--fg-0)')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--fg-2)')}
                title="Remove"
              >
                ×
              </button>
            </span>
          ))}

          {!atMax && (
            <input
              ref={inputRef}
              value={pending}
              onChange={(e) => setPending(e.target.value)}
              onKeyDown={onKeyDown}
              onBlur={addPending}
              placeholder={ids.length === 0 ? 'Paste run IDs separated by commas, or select from Test Runs…' : 'Add another ID…'}
              style={{
                flex: 1,
                minWidth: 180,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: 'var(--fg-0)',
                fontSize: 13,
                padding: '2px 0',
              }}
            />
          )}

          {atMax && (
            <span style={{ fontSize: 12, color: 'var(--fg-3)', marginLeft: 4 }}>
              Max 4 runs
            </span>
          )}
        </div>

        {ids.length > 0 && ids.length < 2 && (
          <p style={{ fontSize: 12.5, color: 'var(--fg-2)', margin: 0 }}>
            Add at least one more run to compare.
          </p>
        )}

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

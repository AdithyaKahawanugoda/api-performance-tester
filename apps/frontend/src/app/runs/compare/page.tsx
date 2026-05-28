'use client';

import { useState, useEffect, useRef, KeyboardEvent, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { RunStatus } from '@/components/runs/RunStatus';
import { ComparisonBarChart } from '@/components/charts/ComparisonBarChart';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { CompareInsights } from '@/components/runs/CompareInsights';
import { useCompareRuns } from '@/hooks/useRuns';
import { formatLatency, formatRps, formatErrorRate, formatBytes } from '@/lib/formatters';

const MAX_RUNS = 4;

function parseIds(raw: string): string[] {
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function CompareContent() {
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="card__title">Latency Comparison</div>
                  <InfoTooltip text="Side-by-side comparison of key latency percentiles across all selected runs. Each group of bars shows avg, p50, p95, and p99 for every run. Shorter bars mean faster responses." />
                </div>
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
                      { label: 'Total Requests', key: 'totalRequests' as const, fmt: (v: number) => v.toLocaleString(), info: undefined },
                      {
                        label: 'Avg Latency', key: 'avgLatency' as const, fmt: formatLatency,
                        info: 'Mean response time across all requests in this run.',
                      },
                      {
                        label: 'p50', key: 'p50' as const, fmt: formatLatency,
                        info: 'Median latency — 50% of requests completed faster than this. Represents the typical user experience.',
                      },
                      {
                        label: 'p95', key: 'p95' as const, fmt: formatLatency,
                        info: '95th percentile latency — 95% of requests finished within this time. Good proxy for tail performance without being skewed by rare outliers.',
                      },
                      {
                        label: 'p99', key: 'p99' as const, fmt: formatLatency,
                        info: '99th percentile latency — only 1% of requests exceeded this. Captures worst-case latency spikes experienced by a small fraction of users.',
                      },
                      {
                        label: 'Avg RPS', key: 'rps' as const, fmt: formatRps,
                        info: 'Average requests per second handled throughout the test. Higher means greater throughput capacity.',
                      },
                      {
                        label: 'Error Rate', key: 'errorRate' as const, fmt: formatErrorRate,
                        info: 'Percentage of requests that returned a 4xx/5xx status or timed out. Below 1% is healthy; above 5% indicates a reliability issue.',
                      },
                    ].map(({ label, key, fmt, info }) => (
                      <tr key={label}>
                        <td>
                          <span className="dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            {label}
                            {info && <InfoTooltip text={info} />}
                          </span>
                        </td>
                        {runs.map((r) => (
                          <td key={r.id} className="num">
                            {r.metrics ? fmt(r.metrics[key] as number) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {runs.some((r) => r.metrics?.avgTtfbMs != null) && (
                      <tr>
                        <td>
                          <span className="dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            Avg TTFB
                            <InfoTooltip text="Average Time To First Byte — time from sending the request until the first byte of the response arrives. Measures server processing + network travel time, before body download begins." />
                          </span>
                        </td>
                        {runs.map((r) => (
                          <td key={r.id} className="num">
                            {r.metrics?.avgTtfbMs != null ? formatLatency(r.metrics.avgTtfbMs) : '—'}
                          </td>
                        ))}
                      </tr>
                    )}
                    {runs.some((r) => r.metrics?.endpointStats?.some((e) => (e.avgResponseBytes ?? 0) > 0)) && (
                      <tr>
                        <td>
                          <span className="dim" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            Avg Response Size
                            <InfoTooltip text="Average response body size across all endpoints, weighted by number of requests. Smaller values mean less bandwidth consumed per request." />
                          </span>
                        </td>
                        {runs.map((r) => {
                          const stats = r.metrics?.endpointStats ?? [];
                          const withBytes = stats.filter((e) => (e.avgResponseBytes ?? 0) > 0);
                          const avg = withBytes.length > 0
                            ? withBytes.reduce((s, e) => s + (e.avgResponseBytes ?? 0), 0) / withBytes.length
                            : null;
                          return (
                            <td key={r.id} className="num">
                              {avg != null ? formatBytes(avg) : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <CompareInsights runs={runs} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}

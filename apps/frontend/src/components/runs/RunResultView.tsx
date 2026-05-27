'use client';

import { useState } from 'react';
import { KPI } from '@/components/ui/KPI';
import { Method } from '@/components/ui/Method';
import { Icon } from '@/components/ui/Icon';
import { StatusCodeChart } from '@/components/charts/StatusCodeChart';
import { PercentileBars } from '@/components/charts/PercentileBars';
import { LatencyLineChart } from '@/components/charts/LatencyLineChart';
import { RpsChart } from '@/components/charts/RpsChart';
import { ErrorRateChart } from '@/components/charts/ErrorRateChart';
import { formatLatency, formatRps, formatErrorRate, formatDuration } from '@/lib/formatters';
import type { TestRun, RunWindow, MetricsWindow } from '@api-perf/shared';

interface Props {
  run: TestRun;
}

type Tab = 'overview' | 'endpoints' | 'config';

function toMetricsWindows(windows: RunWindow[]): MetricsWindow[] {
  return windows.map((w) => ({
    runId: '', workerIndex: 0,
    windowStartMs: w.t, windowEndMs: w.t + 500,
    requestsInWindow: 1, successInWindow: 1 - w.errorRate,
    failureInWindow: w.errorRate,
    rps: w.rps, p50: w.p50, p95: w.p95, p99: w.p99,
    latencies: [],
  }));
}

export function RunResultView({ run }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const m = run.metrics;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!m) {
    return <p className="dim">No metrics available for this run.</p>;
  }

  const percentileRows = [
    { label: 'p50', value: Math.round(m.p50), color: 'var(--accent)' },
    { label: 'p75', value: Math.round((m.p50 + m.p95) / 2), color: 'var(--info)' },
    { label: 'p95', value: Math.round(m.p95), color: 'var(--warn)' },
    { label: 'p99', value: Math.round(m.p99), color: 'var(--err)' },
  ];

  return (
    <div className="stack">
      <div className="grid-6">
        <KPI label="Requests"  value={m.totalRequests.toLocaleString()} />
        <KPI label="Success"   value={m.successCount.toLocaleString()} />
        <KPI label="Failures"  value={m.failureCount.toLocaleString()} />
        <KPI label="Error Rate" value={formatErrorRate(m.errorRate)} />
        <KPI label="Avg RPS"   value={formatRps(m.rps)} />
        <KPI label="Duration"  value={formatDuration(m.durationMs)} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {(['overview', 'endpoints', 'config'] as Tab[]).map((t) => (
            <button
              key={t}
              className={'tabs__item ' + (tab === t ? 'is-active' : '')}
              onClick={() => setTab(t)}
              style={{ textTransform: 'capitalize' }}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="row">
          <a href={`${apiUrl}/runs/${run.id}/export/csv`} download className="btn btn--sm">
            <Icon name="download" size={12} />
            CSV
          </a>
          <a href={`${apiUrl}/runs/${run.id}/export/pdf`} download className="btn btn--sm">
            <Icon name="download" size={12} />
            PDF
          </a>
        </div>
      </div>

      {tab === 'overview' && (
        <div className="stack">
          <div style={{ display: 'flex', gap: 14, alignItems: 'stretch' }}>
            <div className="card" style={{ flex: 1, minWidth: 0 }}>
              <div className="card__head"><div className="card__title">Latency Percentiles</div></div>
              <div className="card__body">
                <PercentileBars rows={percentileRows} />
                <div className="divider" />
                <div className="grid-2" style={{ gap: 8 }}>
                  <div>
                    <div className="label">Min</div>
                    <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{formatLatency(m.minLatency)}</div>
                  </div>
                  <div>
                    <div className="label">Max</div>
                    <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{formatLatency(m.maxLatency)}</div>
                  </div>
                  <div>
                    <div className="label">Avg</div>
                    <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{formatLatency(m.avgLatency)}</div>
                  </div>
                  <div>
                    <div className="label">Avg RPS</div>
                    <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{formatRps(m.rps)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="card__head"><div className="card__title">Status Code Distribution</div></div>
              <div className="card__body" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <StatusCodeChart distribution={m.statusCodeDistribution} />
              </div>
            </div>
          </div>

          {(() => {
            const windows = m.windows ?? [];
            if (windows.length === 0) return null;
            const mw = toMetricsWindows(windows);
            return (
              <div className="grid-3">
                <div className="card">
                  <div className="card__head"><div className="card__title">Latency</div></div>
                  <div className="card__body"><LatencyLineChart data={mw} height={130} /></div>
                </div>
                <div className="card">
                  <div className="card__head"><div className="card__title">RPS</div></div>
                  <div className="card__body"><RpsChart data={mw} height={130} /></div>
                </div>
                <div className="card">
                  <div className="card__head"><div className="card__title">Error rate</div></div>
                  <div className="card__body"><ErrorRateChart data={mw} height={130} /></div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {tab === 'endpoints' && (
        <div className="card">
          <div className="card__body--flush">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Success</th>
                  <th>Failure</th>
                  <th>Avg Latency</th>
                  <th>p99</th>
                </tr>
              </thead>
              <tbody>
                {m.endpointStats.map((e, i) => (
                  <tr key={i}>
                    <td>
                      <div className="row" style={{ gap: 8 }}>
                        <Method>{e.method}</Method>
                        <span className="mono dim" style={{ fontSize: 11.5 }}>
                          {e.url.length > 60 ? e.url.slice(0, 59) + '…' : e.url}
                        </span>
                      </div>
                    </td>
                    <td className="num" style={{ color: 'var(--ok)' }}>{e.successCount.toLocaleString()}</td>
                    <td className="num" style={{ color: 'var(--err)' }}>{e.failureCount.toLocaleString()}</td>
                    <td className="num">{formatLatency(e.avgLatency)}</td>
                    <td className="num">{formatLatency(e.p99)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'config' && (
        <div className="card">
          <div className="card__body">
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11.5,
              color: 'var(--fg-1)',
              background: 'var(--bg-0)',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius-sm)',
              padding: 14,
              overflow: 'auto',
              maxHeight: 480,
            }}>
              {JSON.stringify(run.config, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

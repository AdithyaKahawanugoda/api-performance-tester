'use client';

import { useState, useEffect } from 'react';
import { KPI } from '@/components/ui/KPI';
import { Method } from '@/components/ui/Method';
import { Icon } from '@/components/ui/Icon';
import { InfoTooltip } from '@/components/shared/InfoTooltip';
import { StatusCodeChart } from '@/components/charts/StatusCodeChart';
import { PercentileBars } from '@/components/charts/PercentileBars';
import { LatencyLineChart } from '@/components/charts/LatencyLineChart';
import { RpsChart } from '@/components/charts/RpsChart';
import { ErrorRateChart } from '@/components/charts/ErrorRateChart';
import { RunInsights } from '@/components/runs/RunInsights';
import { formatLatency, formatRps, formatErrorRate, formatDuration } from '@/lib/formatters';
import type { TestRun, RunWindow, MetricsWindow } from '@api-perf/shared';

interface Props {
  run: TestRun;
}

type Tab = 'overview' | 'endpoints' | 'config';
type ChartKey = 'latency' | 'rps' | 'errorRate';

const CHART_TITLES: Record<ChartKey, string> = {
  latency: 'Latency over time',
  rps: 'RPS over time',
  errorRate: 'Error rate over time',
};

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
  const [zoomed, setZoomed] = useState<ChartKey | null>(null);
  const m = run.metrics;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    if (!zoomed) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setZoomed(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [zoomed]);

  if (!m) {
    return <p className="dim">No metrics available for this run.</p>;
  }

  const mw = (m.windows?.length ?? 0) > 0 ? toMetricsWindows(m.windows!) : null;

  const percentileRows = [
    { label: 'p50', value: Math.round(m.p50), color: 'var(--accent)' },
    { label: 'p75', value: Math.round((m.p50 + m.p95) / 2), color: 'var(--info)' },
    { label: 'p95', value: Math.round(m.p95), color: 'var(--warn)' },
    { label: 'p99', value: Math.round(m.p99), color: 'var(--err)' },
  ];

  return (
    <div className="stack">
      <div className="grid-6">
        <KPI label="Requests"   value={m.totalRequests.toLocaleString()} />
        <KPI label="Success"    value={m.successCount.toLocaleString()} />
        <KPI label="Failures"   value={m.failureCount.toLocaleString()} />
        <KPI
          label="Error Rate"
          value={formatErrorRate(m.errorRate)}
          info="Percentage of requests that returned a 4xx/5xx status code or timed out. Below 1% is generally healthy; above 5% indicates a reliability problem."
        />
        <KPI
          label="Avg RPS"
          value={formatRps(m.rps)}
          info="Average requests per second the API handled throughout the test. Reflects throughput capacity — higher means the server can process more load."
        />
        <KPI label="Duration"   value={formatDuration(m.durationMs)} />
      </div>

      <RunInsights run={run} />

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
              <div className="card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="card__title">Latency Percentiles</div>
                  <InfoTooltip text="Shows how response time is distributed. p50 is the median (typical experience), p95 covers 95% of requests, p99 covers 99%. A large gap between p50 and p99 means some requests are significantly slower than average." />
                </div>
              </div>
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
                    <div className="label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      Avg RPS
                      <InfoTooltip text="Average requests per second the server handled throughout the test. Higher indicates greater throughput capacity." />
                    </div>
                    <div className="num" style={{ fontSize: 15, fontWeight: 600 }}>{formatRps(m.rps)}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <div className="card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="card__title">Status Code Distribution</div>
                  <InfoTooltip text="Breakdown of HTTP response codes. 2xx = success, 3xx = redirect, 4xx = client error, 5xx = server error, 0 = network timeout or connection refused." />
                </div>
              </div>
              <div className="card__body" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                <StatusCodeChart distribution={m.statusCodeDistribution} />
              </div>
            </div>
          </div>

          {mw && (
            <div className="grid-3">
              {([
                {
                  key: 'latency' as ChartKey,
                  title: 'Latency',
                  info: 'Response time over the test duration, broken down by p50, p95, and p99. Flat lines = stable; upward spikes indicate periods of degraded performance.',
                  chart: <LatencyLineChart data={mw} height={130} />,
                },
                {
                  key: 'rps' as ChartKey,
                  title: 'RPS',
                  info: 'Requests per second over time. Shows whether throughput remained steady or fluctuated. Drops may indicate the server struggling under load.',
                  chart: <RpsChart data={mw} height={130} />,
                },
                {
                  key: 'errorRate' as ChartKey,
                  title: 'Error rate',
                  info: 'Fraction of failed requests in each time window. A rising trend suggests the server is approaching capacity limits or experiencing upstream failures.',
                  chart: <ErrorRateChart data={mw} height={130} />,
                },
              ]).map(({ key, title, info, chart }) => (
                <div key={key} className="card chart-card" onClick={() => setZoomed(key)}>
                  <div className="card__head">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div className="card__title">{title}</div>
                      <InfoTooltip text={info} />
                    </div>
                    <Icon name="expand" size={12} className="chart-hint" style={{ color: 'var(--fg-2)' }} />
                  </div>
                  <div className="card__body">{chart}</div>
                </div>
              ))}
            </div>
          )}
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
                  <th>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Avg Latency
                      <InfoTooltip text="Mean response time for this endpoint across all requests during the test." />
                    </span>
                  </th>
                  <th>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      p99
                      <InfoTooltip text="99th percentile latency for this endpoint — 99% of requests completed faster than this. Reflects the worst-case experience for this route." />
                    </span>
                  </th>
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

      {zoomed && mw && (
        <div className="chart-overlay" onClick={() => setZoomed(null)}>
          <div className="chart-overlay__panel" onClick={(e) => e.stopPropagation()}>
            <div className="card__head">
              <div className="card__title">{CHART_TITLES[zoomed]}</div>
              <button className="btn btn--ghost btn--sm" onClick={() => setZoomed(null)}>
                <Icon name="x" size={12} />
              </button>
            </div>
            <div className="card__body">
              {zoomed === 'latency'   && <LatencyLineChart data={mw} height={260} />}
              {zoomed === 'rps'       && <RpsChart data={mw} height={260} />}
              {zoomed === 'errorRate' && <ErrorRateChart data={mw} height={260} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

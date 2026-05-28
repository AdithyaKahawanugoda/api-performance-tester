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
import { SystemResourceChart } from '@/components/charts/SystemResourceChart';
import { LatencyBreakdownChart } from '@/components/charts/LatencyBreakdownChart';
import { ResponseSizeChart } from '@/components/charts/ResponseSizeChart';
import { RunInsights } from '@/components/runs/RunInsights';
import { formatLatency, formatRps, formatErrorRate, formatDuration, formatBytes } from '@/lib/formatters';
import { detectAuthType, getPayloadSizeLabel, extractQueryParams, getEndpointWeights } from '@/lib/configAnalysis';
import type { TestRun, RunWindow, MetricsWindow } from '@api-perf/shared';

interface Props {
  run: TestRun;
}

type Tab = 'overview' | 'endpoints' | 'config';
type ChartKey = 'latency' | 'rps' | 'errorRate' | 'systemResources';

const CHART_TITLES: Record<ChartKey, string> = {
  latency: 'Latency over time',
  rps: 'RPS over time',
  errorRate: 'Error rate over time',
  systemResources: 'System Resources',
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

  const hasTtfb = m.avgTtfbMs != null;
  const connectionTimingRows = hasTtfb && m.endpointStats[0] ? (() => {
    // Best effort: use first endpoint's timing as representative (or aggregate)
    const avgTtfb = m.avgTtfbMs!;
    const bodyDownload = Math.max(0, m.avgLatency - avgTtfb);
    return [
      { label: 'TTFB',      value: Math.round(avgTtfb),     color: 'var(--accent)' },
      { label: 'Body',      value: Math.round(bodyDownload), color: 'var(--info)' },
    ];
  })() : null;

  return (
    <div className="stack">
      {/* KPI row */}
      <div className="grid-6" style={hasTtfb || m.bytesReceived > 0 ? { gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' } : {}}>
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
        {hasTtfb && (
          <KPI
            label="Avg TTFB"
            value={formatLatency(m.avgTtfbMs!)}
            info="Average Time to First Byte — how long from sending the request until the first byte of the response is received. Dominated by server processing and network round-trip time."
          />
        )}
        {m.bytesReceived > 0 && (
          <KPI
            label="Data Received"
            value={formatBytes(m.bytesReceived)}
            info="Total bytes received across all responses in this test run."
          />
        )}
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
            {/* Latency Percentiles */}
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

                {connectionTimingRows && (
                  <>
                    <div className="divider" />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <span className="label" style={{ marginBottom: 0 }}>Latency Breakdown</span>
                      <InfoTooltip text="Shows how avg total latency is split between server processing (TTFB — time until first byte) and body download time." />
                    </div>
                    <PercentileBars rows={connectionTimingRows} />
                  </>
                )}
              </div>
            </div>

            {/* Status Code Distribution */}
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

          {/* Time-series charts */}
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

          {/* Advanced charts row */}
          <div className="grid-3">
            <div className="card">
              <div className="card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="card__title">TTFB Breakdown by Endpoint</div>
                  <InfoTooltip text="Stacked bars showing Time to First Byte (server processing, accent) vs body download time (muted blue) per endpoint. Helps pinpoint whether latency is in server logic or data transfer." />
                </div>
              </div>
              <div className="card__body">
                <LatencyBreakdownChart endpoints={m.endpointStats} />
              </div>
            </div>

            <div className="card">
              <div className="card__head">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div className="card__title">Response Size by Endpoint</div>
                  <InfoTooltip text="Average response payload size per endpoint. Large responses (>50KB, orange) may benefit from pagination, field filtering, or gzip compression." />
                </div>
              </div>
              <div className="card__body">
                <ResponseSizeChart endpoints={m.endpointStats} />
              </div>
            </div>

            {mw && (
              <div className="card chart-card" onClick={() => setZoomed('systemResources')}>
                <div className="card__head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div className="card__title">System Resources</div>
                    <InfoTooltip text="Worker CPU usage (%) and heap memory (MB) over the test duration. A steadily rising memory line may indicate a memory leak; CPU spikes correlate with load bursts." />
                  </div>
                  <Icon name="expand" size={12} className="chart-hint" style={{ color: 'var(--fg-2)' }} />
                </div>
                <div className="card__body">
                  <SystemResourceChart windows={m.windows!} height={160} />
                </div>
              </div>
            )}
          </div>
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
                      Avg TTFB
                      <InfoTooltip text="Average Time to First Byte for this endpoint — server processing + network round trip, before body download begins." />
                    </span>
                  </th>
                  <th>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Avg Size
                      <InfoTooltip text="Average response payload size. Only populated when 'Capture Response Size' is enabled on the config, or when the server returns a Content-Length header." />
                    </span>
                  </th>
                  <th>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      Cache Hit%
                      <InfoTooltip text="Fraction of requests that received a cache hit (X-Cache: HIT or CF-Cache-Status: HIT). Only detectable via response headers." />
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
                    <td className="num">{e.avgTtfbMs != null ? formatLatency(e.avgTtfbMs) : <span className="dim">—</span>}</td>
                    <td className="num">{e.avgResponseBytes != null && e.avgResponseBytes > 0 ? formatBytes(e.avgResponseBytes) : <span className="dim">—</span>}</td>
                    <td className="num">
                      {e.cacheHitRate != null
                        ? <span style={{ color: e.cacheHitRate > 0.5 ? 'var(--ok)' : e.cacheHitRate > 0 ? 'var(--warn)' : 'var(--fg-2)' }}>
                            {(e.cacheHitRate * 100).toFixed(0)}%
                          </span>
                        : <span className="dim">—</span>
                      }
                    </td>
                    <td className="num">{formatLatency(e.p99)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Error samples */}
          {m.endpointStats.some((e) => (e.errorSamples?.length ?? 0) > 0) && (
            <div className="card__body" style={{ borderTop: '1px solid var(--line-soft)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-0)' }}>Error Samples</span>
                <InfoTooltip text="Captured response bodies from failed (4xx/5xx) requests — up to 5 distinct messages per endpoint." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.endpointStats.filter((e) => (e.errorSamples?.length ?? 0) > 0).map((e, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <Method>{e.method}</Method>
                      <span className="mono dim" style={{ fontSize: 11 }}>{e.url.length > 60 ? e.url.slice(0, 59) + '…' : e.url}</span>
                    </div>
                    {e.errorSamples!.map((s, j) => (
                      <pre key={j} style={{
                        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--err)',
                        background: 'color-mix(in oklch, var(--err) 6%, var(--bg-0))',
                        border: '1px solid color-mix(in oklch, var(--err) 20%, var(--line))',
                        borderRadius: 'var(--radius-sm)', padding: '6px 10px', margin: '4px 0',
                        overflow: 'auto', maxHeight: 80, whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                      }}>
                        {s}
                      </pre>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'config' && (
        <div className="stack">
          {/* Config Analysis */}
          <div className="card">
            <div className="card__head">
              <div className="card__title">Config Analysis</div>
            </div>
            <div className="card__body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {run.config.endpoints.map((ep, i) => {
                  const authType = detectAuthType(ep.headers);
                  const payloadLabel = getPayloadSizeLabel(ep.body);
                  const queryParams = extractQueryParams(ep.url);
                  return (
                    <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div className="row" style={{ gap: 8 }}>
                        <Method>{ep.method}</Method>
                        <span className="mono" style={{ fontSize: 11.5, color: 'var(--fg-1)' }}>{ep.url}</span>
                      </div>
                      <div className="grid-4" style={{ gap: 8 }}>
                        <div>
                          <div className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Auth Type
                            <InfoTooltip text="Detected from the Authorization or API key headers configured for this endpoint." />
                          </div>
                          <span className="tag" style={{ color: authType === 'None' ? 'var(--fg-3)' : 'var(--info)' }}>{authType}</span>
                        </div>
                        <div>
                          <div className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Payload Size
                            <InfoTooltip text="Estimated size of the request body (JSON serialized). Larger payloads increase upload time and server parsing overhead." />
                          </div>
                          <span className="tag">{payloadLabel}</span>
                        </div>
                        <div>
                          <div className="label" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            Query Params
                            <InfoTooltip text="Query parameter keys extracted from the URL. Values are not shown." />
                          </div>
                          <span className="tag" style={{ color: queryParams.length > 0 ? 'var(--fg-1)' : 'var(--fg-3)' }}>
                            {queryParams.length > 0 ? queryParams.join(', ') : 'None'}
                          </span>
                        </div>
                        <div>
                          <div className="label">Weight</div>
                          <span className="tag">{ep.weight ?? 1}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Traffic split */}
                {run.config.endpoints.length > 1 && (() => {
                  const weights = getEndpointWeights(run.config.endpoints);
                  return (
                    <>
                      <div className="divider" style={{ margin: '4px 0' }} />
                      <div>
                        <div className="label" style={{ marginBottom: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          Traffic Distribution
                          <InfoTooltip text="How traffic is split across endpoints based on their configured weights." />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {weights.map((w, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 240, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {w.label}
                              </div>
                              <div style={{ flex: 1, height: 14, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
                                <div style={{ width: `${w.percent}%`, height: '100%', background: 'var(--accent)', opacity: 0.7 }} />
                              </div>
                              <span className="num dim" style={{ fontSize: 11.5, width: 40, textAlign: 'right' }}>{w.percent.toFixed(0)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Raw config JSON */}
          <div className="card">
            <div className="card__head"><div className="card__title">Raw Config</div></div>
            <div className="card__body">
              <pre style={{
                fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--fg-1)',
                background: 'var(--bg-0)', border: '1px solid var(--line)',
                borderRadius: 'var(--radius-sm)', padding: 14, overflow: 'auto', maxHeight: 480,
              }}>
                {JSON.stringify(run.config, null, 2)}
              </pre>
            </div>
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
              {zoomed === 'latency'         && <LatencyLineChart data={mw} height={260} />}
              {zoomed === 'rps'             && <RpsChart data={mw} height={260} />}
              {zoomed === 'errorRate'       && <ErrorRateChart data={mw} height={260} />}
              {zoomed === 'systemResources' && <SystemResourceChart windows={m.windows!} height={300} />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

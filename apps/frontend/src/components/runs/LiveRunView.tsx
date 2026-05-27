'use client';

import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { useRunStore } from '@/store/runStore';
import { KPI } from '@/components/ui/KPI';
import { Method } from '@/components/ui/Method';
import { LatencyLineChart } from '@/components/charts/LatencyLineChart';
import { RpsChart } from '@/components/charts/RpsChart';
import { ErrorRateChart } from '@/components/charts/ErrorRateChart';
import { formatLatency, formatRps } from '@/lib/formatters';
import type { RequestLogEntry } from '@api-perf/shared';

const EMPTY_LOGS: RequestLogEntry[] = [];

interface Props {
  runId: string;
}

function statusClass(code: number | undefined): string {
  if (!code) return 'st-x';
  if (code >= 500) return 'st-5';
  if (code >= 400) return 'st-4';
  if (code >= 200) return 'st-2';
  return '';
}

export function LiveRunView({ runId }: Props) {
  const metricsWindows = useLiveMetrics(runId);
  const logBuffer = useRunStore((s) => s.logBuffer[runId] ?? EMPTY_LOGS);

  const latest = metricsWindows[metricsWindows.length - 1];

  return (
    <div className="stack">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="live-dot">Live</span>
        <span className="dim" style={{ fontSize: 11.5 }}>{metricsWindows.length} windows collected</span>
      </div>

      <div className="grid-4">
        <KPI label="Current RPS"     value={latest ? formatRps(latest.rps) : '—'}     live />
        <KPI label="p50 Latency"     value={latest ? formatLatency(latest.p50) : '—'} live />
        <KPI label="p99 Latency"     value={latest ? formatLatency(latest.p99) : '—'} live />
        <KPI label="Errors (window)" value={latest ? String(latest.failureInWindow) : '—'} live />
      </div>

      <div className="card">
        <div className="card__head"><div className="card__title">Latency Percentiles</div></div>
        <div className="card__body">
          <LatencyLineChart data={metricsWindows} />
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card__head"><div className="card__title">Requests / Second</div></div>
          <div className="card__body">
            <RpsChart data={metricsWindows} />
          </div>
        </div>
        <div className="card">
          <div className="card__head"><div className="card__title">Error Rate</div></div>
          <div className="card__body">
            <ErrorRateChart data={metricsWindows} />
          </div>
        </div>
      </div>

      {logBuffer.length > 0 && (
        <div className="card">
          <div className="card__head">
            <div className="card__title">Live Request Log</div>
            <span className="dim" style={{ fontSize: 11.5 }}>last {logBuffer.length}</span>
          </div>
          <div className="card__body--flush">
            <div className="log">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Method</th>
                    <th>URL</th>
                    <th>Status</th>
                    <th>Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {logBuffer.slice(0, 100).map((entry, i) => (
                    <tr key={i}>
                      <td className="dim">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                      <td><Method>{entry.method}</Method></td>
                      <td style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {entry.url}
                      </td>
                      <td className={statusClass(entry.statusCode ?? undefined)}>
                        {entry.statusCode ?? 'ERR'}
                      </td>
                      <td className="num">{entry.latencyMs.toFixed(1)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useLiveMetrics } from '@/hooks/useLiveMetrics';
import { useRunStore } from '@/store/runStore';
import { LatencyLineChart } from '@/components/charts/LatencyLineChart';
import { RpsChart } from '@/components/charts/RpsChart';
import { ErrorRateChart } from '@/components/charts/ErrorRateChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatLatency, formatRps } from '@/lib/formatters';
import { Loader2 } from 'lucide-react';
import type { RequestLogEntry } from '@api-perf/shared';

const EMPTY_LOGS: RequestLogEntry[] = [];

interface Props {
  runId: string;
}

export function LiveRunView({ runId }: Props) {
  const metricsWindows = useLiveMetrics(runId);
  const logBuffer = useRunStore((s) => s.logBuffer[runId] ?? EMPTY_LOGS);

  const latest = metricsWindows[metricsWindows.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        Live — {metricsWindows.length} windows collected
      </div>

      {latest && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: 'Current RPS', value: formatRps(latest.rps) },
            { label: 'p50 Latency', value: formatLatency(latest.p50) },
            { label: 'p99 Latency', value: formatLatency(latest.p99) },
            { label: 'Errors (window)', value: String(latest.failureInWindow) },
          ].map(({ label, value }) => (
            <Card key={label}>
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Latency Percentiles (Live)</CardTitle>
        </CardHeader>
        <CardContent>
          <LatencyLineChart data={metricsWindows} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Requests / Second</CardTitle>
          </CardHeader>
          <CardContent>
            <RpsChart data={metricsWindows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Error Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <ErrorRateChart data={metricsWindows} />
          </CardContent>
        </Card>
      </div>

      {logBuffer.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Live Request Log (last {logBuffer.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto rounded border border-border font-mono text-xs">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted text-left">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Method</th>
                    <th className="px-3 py-2">URL</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {logBuffer.slice(0, 100).map((entry, i) => (
                    <tr key={i} className="border-t border-border hover:bg-muted/50">
                      <td className="px-3 py-1.5 text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</td>
                      <td className="px-3 py-1.5 font-semibold">{entry.method}</td>
                      <td className="max-w-[200px] truncate px-3 py-1.5 text-muted-foreground">{entry.url}</td>
                      <td className={`px-3 py-1.5 ${entry.statusCode && entry.statusCode < 400 ? 'text-emerald-500' : 'text-red-500'}`}>{entry.statusCode ?? 'ERR'}</td>
                      <td className="px-3 py-1.5">{entry.latencyMs.toFixed(1)}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

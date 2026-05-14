'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusCodeChart } from '@/components/charts/StatusCodeChart';
import { formatLatency, formatRps, formatErrorRate, formatDuration } from '@/lib/formatters';
import { Download } from 'lucide-react';
import type { TestRun } from '@api-perf/shared';

interface Props {
  run: TestRun;
}

export function RunResultView({ run }: Props) {
  const m = run.metrics;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (!m) {
    return <p className="text-muted-foreground">No metrics available for this run.</p>;
  }

  const stats = [
    { label: 'Total Requests', value: m.totalRequests.toLocaleString() },
    { label: 'Success', value: m.successCount.toLocaleString() },
    { label: 'Failures', value: m.failureCount.toLocaleString() },
    { label: 'Error Rate', value: formatErrorRate(m.errorRate) },
    { label: 'Avg RPS', value: formatRps(m.rps) },
    { label: 'Duration', value: formatDuration(m.durationMs) },
    { label: 'Min Latency', value: formatLatency(m.minLatency) },
    { label: 'Max Latency', value: formatLatency(m.maxLatency) },
    { label: 'Avg Latency', value: formatLatency(m.avgLatency) },
    { label: 'p50', value: formatLatency(m.p50) },
    { label: 'p95', value: formatLatency(m.p95) },
    { label: 'p99', value: formatLatency(m.p99) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Test Results</h2>
        <div className="flex gap-2">
          <a href={`${apiUrl}/runs/${run.id}/export/csv`} download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </a>
          <a href={`${apiUrl}/runs/${run.id}/export/pdf`} download>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
        {stats.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="pt-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status Codes</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
        </TabsList>

        <TabsContent value="status" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Code Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusCodeChart distribution={m.statusCodeDistribution} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endpoints" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Per-Endpoint Stats</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4">Endpoint</th>
                      <th className="pb-2 pr-4">Success</th>
                      <th className="pb-2 pr-4">Failure</th>
                      <th className="pb-2 pr-4">Avg Latency</th>
                      <th className="pb-2">p99</th>
                    </tr>
                  </thead>
                  <tbody>
                    {m.endpointStats.map((e, i) => (
                      <tr key={i} className="border-b">
                        <td className="py-2 pr-4 font-mono text-xs">
                          <span className="font-semibold">{e.method}</span>{' '}
                          <span className="text-muted-foreground">{e.url.slice(0, 50)}</span>
                        </td>
                        <td className="py-2 pr-4 text-emerald-500">{e.successCount}</td>
                        <td className="py-2 pr-4 text-red-500">{e.failureCount}</td>
                        <td className="py-2 pr-4">{formatLatency(e.avgLatency)}</td>
                        <td className="py-2">{formatLatency(e.p99)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

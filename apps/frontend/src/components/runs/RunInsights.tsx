import { formatLatency, formatRps, formatErrorRate, formatDuration, formatBytes } from '@/lib/formatters';
import type { TestRun } from '@api-perf/shared';

type InsightType = 'ok' | 'warn' | 'err' | 'info';

interface Insight {
  type: InsightType;
  title: string;
  text: string;
  note?: string;
  dividerBefore?: boolean;
}

const TYPE_STYLE: Record<InsightType, { color: string; bg: string; border: string; icon: string }> = {
  ok:   { color: 'var(--ok)',   bg: 'color-mix(in oklch, var(--ok) 8%, var(--bg-1))',   border: 'color-mix(in oklch, var(--ok) 25%, var(--line))',   icon: '✓' },
  warn: { color: 'var(--warn)', bg: 'color-mix(in oklch, var(--warn) 8%, var(--bg-1))', border: 'color-mix(in oklch, var(--warn) 25%, var(--line))', icon: '▲' },
  err:  { color: 'var(--err)',  bg: 'color-mix(in oklch, var(--err) 8%, var(--bg-1))',  border: 'color-mix(in oklch, var(--err) 25%, var(--line))',  icon: '✕' },
  info: { color: 'var(--info)', bg: 'color-mix(in oklch, var(--info) 8%, var(--bg-1))', border: 'color-mix(in oklch, var(--info) 25%, var(--line))', icon: 'ℹ' },
};

function shorten(url: string, max = 52) {
  return url.length > max ? url.slice(0, max - 1) + '…' : url;
}

function buildInsights(run: TestRun): Insight[] {
  const m = run.metrics;
  if (!m) return [];

  const insights: Insight[] = [];

  // ── Reliability ──────────────────────────────────────────────────────────
  if (m.errorRate === 0) {
    insights.push({
      type: 'ok',
      title: 'Zero Errors',
      text: 'Every request completed successfully — no 4xx/5xx responses or timeouts detected.',
      note: 'Error rate = requests returning a 4xx/5xx status or a network timeout ÷ total requests sent.',
    });
  } else if (m.errorRate < 0.01) {
    insights.push({
      type: 'ok',
      title: 'Healthy Reliability',
      text: `Low error rate of ${formatErrorRate(m.errorRate)} — well within the healthy <1% threshold. The occasional failure is likely transient.`,
      note: 'Error rate = requests returning a 4xx/5xx status or timeout ÷ total requests. Below 1% is generally acceptable.',
    });
  } else if (m.errorRate < 0.05) {
    insights.push({
      type: 'warn',
      title: 'Elevated Errors',
      text: `${formatErrorRate(m.errorRate)} of requests failed — above the 1% warning threshold. Check the Status Code Distribution chart to identify whether errors are 4xx (client/config issue) or 5xx (server issue).`,
      note: 'Error rate > 1% warrants investigation; > 5% indicates a reliability problem that needs immediate attention.',
    });
  } else {
    insights.push({
      type: 'err',
      title: 'High Error Rate',
      text: `${formatErrorRate(m.errorRate)} of requests failed — over 5% is a critical reliability threshold. Inspect server logs and the status code breakdown immediately.`,
      note: 'Error rate = requests returning a 4xx/5xx status or timeout ÷ total requests. Values above 5% indicate a serious issue.',
    });
  }

  // ── Tail latency consistency ──────────────────────────────────────────────
  if (m.p50 > 0) {
    const spread = m.p99 / m.p50;
    if (spread < 1.5) {
      insights.push({
        type: 'ok',
        title: 'Stable Latency',
        text: `Response times are highly consistent — p99 (${formatLatency(m.p99)}) is only ${spread.toFixed(1)}× the median (${formatLatency(m.p50)}), indicating minimal variance under load.`,
        note: 'p50 (median) = half of requests were faster than this. p99 = only 1% of requests took longer than this. A ratio close to 1× means very consistent timing.',
      });
    } else if (spread < 3) {
      insights.push({
        type: 'info',
        title: 'Moderate Tail Latency',
        text: `p99 (${formatLatency(m.p99)}) is ${spread.toFixed(1)}× the median (${formatLatency(m.p50)}). Some requests are noticeably slower — possibly due to garbage collection pauses or connection pool reuse delays.`,
        note: 'p99 = 99th percentile — 99% of requests completed faster than this value. GC (Garbage Collection) = automatic memory cleanup that can briefly pause the Node.js process.',
      });
    } else {
      insights.push({
        type: 'warn',
        title: 'High Latency Variance',
        text: `p99 (${formatLatency(m.p99)}) is ${spread.toFixed(1)}× the median (${formatLatency(m.p50)}). A small fraction of requests are significantly slower than the typical experience. Investigate GC pauses, connection pool exhaustion, or slow database queries.`,
        note: 'p50 = median request time. p99 = worst-case time (top 1%). A ratio above 3× means outlier requests are dramatically slower — often a sign of resource contention.',
      });
    }
  }

  // ── Throughput summary ───────────────────────────────────────────────────
  insights.push({
    type: 'info',
    title: 'Throughput Summary',
    text: `Sustained ${formatRps(m.rps)} across ${m.totalRequests.toLocaleString()} requests over a ${formatDuration(m.durationMs)} test window.`,
    note: 'RPS (Requests Per Second) = number of requests completed per second, averaged across the full test duration.',
  });

  // ── Endpoint breakdown (split into two items with a divider) ──────────────
  if (m.endpointStats && m.endpointStats.length > 1) {
    const sorted = [...m.endpointStats].sort((a, b) => b.avgLatency - a.avgLatency);
    const slowest = sorted[0];
    const fastest = sorted[sorted.length - 1];

    insights.push({
      type: 'warn',
      title: 'Slowest Endpoint',
      text: `${slowest.method} ${shorten(slowest.url)} averaged ${formatLatency(slowest.avgLatency)} — the highest latency across all configured endpoints.`,
    });

    insights.push({
      type: 'ok',
      title: 'Fastest Endpoint',
      text: `${fastest.method} ${shorten(fastest.url)} averaged ${formatLatency(fastest.avgLatency)} — the lowest latency across all configured endpoints.`,
      dividerBefore: true,
    });
  }

  // ── TTFB proportion ──────────────────────────────────────────────────────
  if (m.avgTtfbMs != null && m.avgLatency > 0) {
    const ttfbPct = (m.avgTtfbMs / m.avgLatency) * 100;
    if (ttfbPct > 70) {
      insights.push({
        type: 'warn',
        title: 'Server Processing Bottleneck',
        text: `TTFB accounts for ${ttfbPct.toFixed(0)}% of total latency (${formatLatency(m.avgTtfbMs)} of ${formatLatency(m.avgLatency)}). Most time is spent waiting for the server to respond, not transferring data. Consider response streaming, edge caching, or query optimisation.`,
        note: 'TTFB (Time to First Byte) = elapsed time from sending the request to receiving the first byte of the response. High TTFB means the server is slow to start responding.',
      });
    } else if (ttfbPct < 30 && m.avgLatency > 100) {
      insights.push({
        type: 'info',
        title: 'Body Transfer Dominated',
        text: `TTFB is only ${ttfbPct.toFixed(0)}% of total latency (${formatLatency(m.avgTtfbMs)}) — the server responds quickly, but most time is spent downloading the response body. Consider gzip compression or pagination to reduce payload size.`,
        note: 'TTFB (Time to First Byte) = time until the server starts sending a response. When TTFB is low but total latency is high, the bottleneck is body transfer size.',
      });
    }
  }

  // ── Large responses ──────────────────────────────────────────────────────
  if (m.endpointStats) {
    const largeEndpoints = m.endpointStats.filter((e) => (e.avgResponseBytes ?? 0) > 50_000);
    if (largeEndpoints.length > 0) {
      const top = largeEndpoints.sort((a, b) => (b.avgResponseBytes ?? 0) - (a.avgResponseBytes ?? 0))[0];
      insights.push({
        type: 'warn',
        title: 'Large Response Detected',
        text: `${top.method} ${shorten(top.url)} returns an average of ${formatBytes(top.avgResponseBytes ?? 0)} per response. Consider pagination, sparse field selection, or enabling gzip compression to reduce transfer size and improve perceived latency.`,
        note: 'Responses over 50 KB are flagged here. Large payloads increase download time, mobile data usage, and memory pressure on the client.',
      });
    }
  }

  // ── Cache effectiveness ──────────────────────────────────────────────────
  if (m.endpointStats) {
    const withCache = m.endpointStats.filter((e) => e.cacheHitRate != null);
    if (withCache.length > 0) {
      const avgHitRate = withCache.reduce((s, e) => s + (e.cacheHitRate ?? 0), 0) / withCache.length;
      if (avgHitRate > 0.5) {
        insights.push({
          type: 'ok',
          title: 'Effective Caching',
          text: `${(avgHitRate * 100).toFixed(0)}% of cacheable requests are served from cache, significantly reducing origin server load and response latency.`,
          note: 'Cache hit = the response was served from a CDN or proxy cache instead of reaching the origin server. Detected via X-Cache or CF-Cache-Status response headers.',
        });
      } else if (avgHitRate === 0) {
        const getEndpoints = withCache.filter((e) => e.method === 'GET');
        if (getEndpoints.length > 0) {
          insights.push({
            type: 'info',
            title: 'Cache Opportunity',
            text: 'No cache hits were detected on GET endpoints. Adding a CDN or in-memory cache layer in front of this API could substantially reduce latency and backend load for repeated identical requests.',
            note: 'Cache hit rate is detected from X-Cache, CF-Cache-Status, or X-Cache-Status response headers. A value of 0% may also mean the CDN simply does not set these headers.',
          });
        }
      }
    }
  }

  // ── Memory pressure ──────────────────────────────────────────────────────
  if (m.peakMemoryMb != null && m.peakMemoryMb > 200) {
    insights.push({
      type: 'warn',
      title: 'High Memory Usage',
      text: `The load-tester process peaked at ${m.peakMemoryMb.toFixed(0)} MB of heap memory during the run. Under sustained concurrency this may indicate GC pressure. If memory grows across multiple test windows it could point to a memory leak.`,
      note: 'Peak memory is measured on the load-tester worker process (not the target server). GC (Garbage Collection) pressure = the JS runtime spending significant time reclaiming unused memory, which can cause brief latency spikes.',
    });
  }

  return insights;
}

interface Props {
  run: TestRun;
}

export function RunInsights({ run }: Props) {
  const insights = buildInsights(run);
  if (insights.length === 0) return null;

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Insights</div>
        <span style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Auto-generated
        </span>
      </div>
      <div className="card__body" style={{ padding: '10px 14px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {insights.map((ins, i) => {
            const s = TYPE_STYLE[ins.type];
            return (
              <div key={i}>
                {ins.dividerBefore && (
                  <div style={{
                    height: 1,
                    background: 'var(--line)',
                    margin: '4px 0',
                    opacity: 0.5,
                  }} />
                )}
                <div
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: '11px 14px',
                    marginBottom: i < insights.length - 1 && !insights[i + 1]?.dividerBefore ? 6 : 6,
                    background: s.bg,
                    border: `1px solid ${s.border}`,
                    borderLeft: `3px solid ${s.color}`,
                    borderRadius: 'var(--radius-sm)',
                  }}
                >
                  {/* Icon column */}
                  <div style={{
                    flexShrink: 0,
                    width: 22,
                    height: 22,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `color-mix(in oklch, ${s.color} 15%, transparent)`,
                    borderRadius: '50%',
                    marginTop: 1,
                  }}>
                    <span style={{
                      color: s.color,
                      fontWeight: 700,
                      fontSize: 10,
                      fontFamily: 'var(--font-mono)',
                      lineHeight: 1,
                    }}>
                      {s.icon}
                    </span>
                  </div>

                  {/* Content column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: s.color,
                      marginBottom: 4,
                      lineHeight: 1,
                    }}>
                      {ins.title}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--fg-0)', lineHeight: 1.6 }}>
                      {ins.text}
                    </div>
                    {ins.note && (
                      <div style={{
                        marginTop: 6,
                        paddingTop: 6,
                        borderTop: `1px solid ${s.border}`,
                        fontSize: 11,
                        color: 'var(--fg-3)',
                        lineHeight: 1.5,
                        fontStyle: 'italic',
                      }}>
                        {ins.note}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

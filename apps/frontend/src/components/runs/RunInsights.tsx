import { formatLatency, formatRps, formatErrorRate, formatDuration, formatBytes } from '@/lib/formatters';
import type { TestRun } from '@api-perf/shared';

type InsightType = 'ok' | 'warn' | 'err' | 'info';

interface Insight {
  type: InsightType;
  text: string;
}

const TYPE_STYLE: Record<InsightType, { color: string; bg: string; border: string; symbol: string }> = {
  ok:   { color: 'var(--ok)',   bg: 'color-mix(in oklch, var(--ok) 9%, var(--bg-1))',   border: 'color-mix(in oklch, var(--ok) 28%, var(--line))',   symbol: '✓' },
  warn: { color: 'var(--warn)', bg: 'color-mix(in oklch, var(--warn) 9%, var(--bg-1))', border: 'color-mix(in oklch, var(--warn) 28%, var(--line))', symbol: '!' },
  err:  { color: 'var(--err)',  bg: 'color-mix(in oklch, var(--err) 9%, var(--bg-1))',  border: 'color-mix(in oklch, var(--err) 28%, var(--line))',  symbol: '!' },
  info: { color: 'var(--info)', bg: 'color-mix(in oklch, var(--info) 9%, var(--bg-1))', border: 'color-mix(in oklch, var(--info) 28%, var(--line))', symbol: 'i' },
};

function shorten(url: string, max = 48) {
  return url.length > max ? url.slice(0, max - 1) + '…' : url;
}

function buildInsights(run: TestRun): Insight[] {
  const m = run.metrics;
  if (!m) return [];

  const insights: Insight[] = [];

  if (m.errorRate === 0) {
    insights.push({ type: 'ok', text: 'Perfect reliability — zero errors recorded across all requests.' });
  } else if (m.errorRate < 0.01) {
    insights.push({ type: 'ok', text: `Low error rate (${formatErrorRate(m.errorRate)}) — well within the healthy <1% threshold.` });
  } else if (m.errorRate < 0.05) {
    insights.push({ type: 'warn', text: `Elevated error rate (${formatErrorRate(m.errorRate)}) — worth investigating. Check the status code breakdown for patterns.` });
  } else {
    insights.push({ type: 'err', text: `High error rate (${formatErrorRate(m.errorRate)}) — over 5% of requests failed. Inspect server logs and status code distribution immediately.` });
  }

  if (m.p50 > 0) {
    const spread = m.p99 / m.p50;
    if (spread < 1.5) {
      insights.push({ type: 'ok', text: `Consistent response times — p99 (${formatLatency(m.p99)}) is only ${spread.toFixed(1)}× the median, indicating minimal variance under load.` });
    } else if (spread < 3) {
      insights.push({ type: 'info', text: `Moderate tail latency — p99 (${formatLatency(m.p99)}) is ${spread.toFixed(1)}× the median (${formatLatency(m.p50)}). Some requests are slower, possibly due to GC or connection reuse.` });
    } else {
      insights.push({ type: 'warn', text: `Wide tail latency — p99 (${formatLatency(m.p99)}) is ${spread.toFixed(1)}× the median (${formatLatency(m.p50)}). A small fraction of requests are significantly slower — investigate GC pauses, connection pool exhaustion, or slow queries.` });
    }
  }

  insights.push({ type: 'info', text: `Averaged ${formatRps(m.rps)} over ${m.totalRequests.toLocaleString()} total requests during a ${formatDuration(m.durationMs)} test window.` });

  if (m.endpointStats && m.endpointStats.length > 1) {
    const sorted = [...m.endpointStats].sort((a, b) => b.avgLatency - a.avgLatency);
    const slowest = sorted[0];
    const fastest = sorted[sorted.length - 1];
    insights.push({
      type: 'info',
      text: `Slowest endpoint: ${slowest.method} ${shorten(slowest.url)} (${formatLatency(slowest.avgLatency)} avg). Fastest: ${fastest.method} ${shorten(fastest.url)} (${formatLatency(fastest.avgLatency)} avg).`,
    });
  }

  // TTFB proportion
  if (m.avgTtfbMs != null && m.avgLatency > 0) {
    const ttfbPct = (m.avgTtfbMs / m.avgLatency) * 100;
    if (ttfbPct > 70) {
      insights.push({
        type: 'warn',
        text: `Server processing dominates latency — TTFB is ${ttfbPct.toFixed(0)}% of the average response time (${formatLatency(m.avgTtfbMs)} of ${formatLatency(m.avgLatency)}). Consider response streaming, edge caching, or query optimization.`,
      });
    } else if (ttfbPct < 30 && m.avgLatency > 100) {
      insights.push({
        type: 'info',
        text: `TTFB is only ${ttfbPct.toFixed(0)}% of total latency (${formatLatency(m.avgTtfbMs)}) — most time is spent transferring the response body. Consider compression or pagination for large payloads.`,
      });
    }
  }

  // Large responses
  if (m.endpointStats) {
    const largeEndpoints = m.endpointStats.filter((e) => (e.avgResponseBytes ?? 0) > 50_000);
    if (largeEndpoints.length > 0) {
      const top = largeEndpoints.sort((a, b) => (b.avgResponseBytes ?? 0) - (a.avgResponseBytes ?? 0))[0];
      insights.push({
        type: 'warn',
        text: `Large responses detected on ${top.method} ${shorten(top.url)} (avg ${formatBytes(top.avgResponseBytes ?? 0)}). Consider pagination, field filtering, or enabling gzip compression to reduce transfer size.`,
      });
    }
  }

  // Cache effectiveness
  if (m.endpointStats) {
    const withCache = m.endpointStats.filter((e) => e.cacheHitRate != null);
    if (withCache.length > 0) {
      const avgHitRate = withCache.reduce((s, e) => s + (e.cacheHitRate ?? 0), 0) / withCache.length;
      if (avgHitRate > 0.5) {
        insights.push({
          type: 'ok',
          text: `Strong cache effectiveness — ${(avgHitRate * 100).toFixed(0)}% of cacheable requests are cache hits, significantly reducing backend load.`,
        });
      } else if (avgHitRate === 0) {
        const getEndpoints = withCache.filter((e) => e.method === 'GET');
        if (getEndpoints.length > 0) {
          insights.push({
            type: 'info',
            text: `No cache hits detected on GET endpoints. A CDN or in-memory cache layer could significantly reduce latency and server load for repeated requests.`,
          });
        }
      }
    }
  }

  // Memory growth
  if (m.peakMemoryMb != null && m.peakMemoryMb > 200) {
    insights.push({
      type: 'warn',
      text: `Peak worker memory reached ${m.peakMemoryMb.toFixed(0)} MB during the test. This may indicate GC pressure under high concurrency — monitor for memory leaks if memory keeps growing across test windows.`,
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
        <span style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          Auto-generated
        </span>
      </div>
      <div className="card__body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {insights.map((ins, i) => {
            const s = TYPE_STYLE[ins.type];
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '9px 12px',
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderLeft: `3px solid ${s.color}`,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                <span
                  style={{
                    color: s.color,
                    fontWeight: 700,
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    minWidth: 14,
                    marginTop: 1,
                    flexShrink: 0,
                  }}
                >
                  {s.symbol}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--fg-1)', lineHeight: 1.55 }}>
                  {ins.text}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

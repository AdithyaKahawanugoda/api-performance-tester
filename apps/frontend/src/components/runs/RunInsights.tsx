import { formatLatency, formatRps, formatErrorRate, formatDuration } from '@/lib/formatters';
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

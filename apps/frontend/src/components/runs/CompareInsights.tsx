import { useState } from 'react';
import { formatLatency, formatRps, formatErrorRate, formatBytes } from '@/lib/formatters';
import type { TestRun } from '@api-perf/shared';

type InsightType = 'ok' | 'warn' | 'err' | 'info';

interface Insight {
  type: InsightType;
  title: string;
  text: string;
  note?: string;
}

const TYPE_STYLE: Record<InsightType, { color: string; bg: string; border: string; icon: string }> = {
  ok:   { color: 'var(--ok)',   bg: 'color-mix(in oklch, var(--ok) 8%, var(--bg-1))',   border: 'color-mix(in oklch, var(--ok) 25%, var(--line))',   icon: '✓' },
  warn: { color: 'var(--warn)', bg: 'color-mix(in oklch, var(--warn) 8%, var(--bg-1))', border: 'color-mix(in oklch, var(--warn) 25%, var(--line))', icon: '▲' },
  err:  { color: 'var(--err)',  bg: 'color-mix(in oklch, var(--err) 8%, var(--bg-1))',  border: 'color-mix(in oklch, var(--err) 25%, var(--line))',  icon: '✕' },
  info: { color: 'var(--info)', bg: 'color-mix(in oklch, var(--info) 8%, var(--bg-1))', border: 'color-mix(in oklch, var(--info) 25%, var(--line))', icon: 'ℹ' },
};

function buildInsights(runs: TestRun[]): Insight[] {
  const valid = runs.filter((r) => r.metrics != null);
  if (valid.length < 2) return [];

  const insights: Insight[] = [];

  // Fastest p95
  const byP95 = [...valid].sort((a, b) => a.metrics!.p95 - b.metrics!.p95);
  const fastestP95 = byP95[0];
  const slowestP95 = byP95[byP95.length - 1];
  if (fastestP95.id !== slowestP95.id) {
    const pct = ((slowestP95.metrics!.p95 - fastestP95.metrics!.p95) / slowestP95.metrics!.p95 * 100).toFixed(0);
    insights.push({
      type: 'ok',
      title: 'Best Tail Latency',
      text: `"${fastestP95.config.name}" has the lowest p95 latency at ${formatLatency(fastestP95.metrics!.p95)} — ${pct}% faster than "${slowestP95.config.name}" (${formatLatency(slowestP95.metrics!.p95)}).`,
      note: 'p95 = 95th percentile — 95% of requests completed faster than this. A good measure of tail performance without being skewed by rare worst-case spikes.',
    });
  }

  // Highest throughput
  const byRps = [...valid].sort((a, b) => b.metrics!.rps - a.metrics!.rps);
  const topRps = byRps[0];
  const botRps = byRps[byRps.length - 1];
  if (topRps.id !== botRps.id) {
    insights.push({
      type: 'info',
      title: 'Highest Throughput',
      text: `"${topRps.config.name}" processed the most requests at ${formatRps(topRps.metrics!.rps)} — vs ${formatRps(botRps.metrics!.rps)} for "${botRps.config.name}".`,
      note: 'RPS (Requests Per Second) = number of requests completed per second, averaged over the test duration. Higher RPS means greater capacity.',
    });
  } else {
    insights.push({
      type: 'info',
      title: 'Similar Throughput',
      text: `All runs achieved similar throughput, averaging around ${formatRps(topRps.metrics!.rps)}.`,
      note: 'RPS (Requests Per Second) = average number of completed requests per second across the test.',
    });
  }

  // Error rates
  const allZero = valid.every((r) => r.metrics!.errorRate === 0);
  const allUnder1 = valid.every((r) => r.metrics!.errorRate < 0.01);
  const worstErr = [...valid].sort((a, b) => b.metrics!.errorRate - a.metrics!.errorRate)[0];

  if (allZero) {
    insights.push({
      type: 'ok',
      title: 'Zero Errors Across All Runs',
      text: 'Every run completed all requests successfully — no 4xx/5xx responses or timeouts recorded.',
    });
  } else if (allUnder1) {
    insights.push({
      type: 'ok',
      title: 'Healthy Reliability',
      text: 'All runs stayed below 1% error rate — solid reliability across the board.',
      note: 'Error rate = (4xx/5xx responses + timeouts) ÷ total requests. Below 1% is generally considered healthy.',
    });
  } else {
    insights.push({
      type: 'warn',
      title: 'Reliability Concern',
      text: `"${worstErr.config.name}" has the highest error rate at ${formatErrorRate(worstErr.metrics!.errorRate)}. Review its status code breakdown to identify the failure mode.`,
      note: 'Error rate = requests returning a 4xx/5xx status or timeout ÷ total requests. Rates above 1% warrant investigation.',
    });
  }

  // Tail latency consistency
  const spreads = valid
    .filter((r) => r.metrics!.p50 > 0)
    .map((r) => ({ name: r.config.name, spread: r.metrics!.p99 / r.metrics!.p50 }))
    .sort((a, b) => b.spread - a.spread);

  if (spreads.length >= 2) {
    const widest = spreads[0];
    const tightest = spreads[spreads.length - 1];
    if (widest.spread > 2.5) {
      insights.push({
        type: 'warn',
        title: 'Latency Variance',
        text: `"${widest.name}" has the widest tail — p99 is ${widest.spread.toFixed(1)}× its median, suggesting latency spikes. "${tightest.name}" is the most consistent at ${tightest.spread.toFixed(1)}× median.`,
        note: 'p99/p50 ratio measures tail variance. A ratio above 3× means worst-case requests are dramatically slower than the median — often a sign of resource contention.',
      });
    } else {
      insights.push({
        type: 'info',
        title: 'Tail Consistency',
        text: `"${tightest.name}" shows the tightest distribution (p99 is ${tightest.spread.toFixed(1)}× median) while "${widest.name}" is widest (${widest.spread.toFixed(1)}×). All runs show acceptable variance.`,
        note: 'p50 = median request time; p99 = worst 1% of requests. A ratio close to 1× indicates very consistent response times.',
      });
    }
  }

  // Fastest TTFB
  const withTtfb = valid.filter((r) => r.metrics?.avgTtfbMs != null);
  if (withTtfb.length >= 2) {
    const byTtfb = [...withTtfb].sort((a, b) => (a.metrics!.avgTtfbMs ?? 0) - (b.metrics!.avgTtfbMs ?? 0));
    const fastTtfb = byTtfb[0];
    const slowTtfb = byTtfb[byTtfb.length - 1];
    const diff = (slowTtfb.metrics!.avgTtfbMs ?? 0) - (fastTtfb.metrics!.avgTtfbMs ?? 0);
    if (diff > 10) {
      insights.push({
        type: 'ok',
        title: 'Fastest Server Response',
        text: `"${fastTtfb.config.name}" has the lowest avg TTFB at ${formatLatency(fastTtfb.metrics!.avgTtfbMs ?? 0)} — the server starts responding ${formatLatency(diff)} faster than in "${slowTtfb.config.name}".`,
        note: 'TTFB (Time to First Byte) = elapsed time from sending the request to receiving the first response byte. Lower TTFB = faster server processing.',
      });
    }
  }

  // Response size winner
  const withSize = valid.filter((r) => {
    const stats = r.metrics?.endpointStats;
    return stats && stats.some((e) => (e.avgResponseBytes ?? 0) > 0);
  });
  if (withSize.length >= 2) {
    const avgSize = (run: TestRun) => {
      const stats = run.metrics?.endpointStats ?? [];
      const withBytes = stats.filter((e) => (e.avgResponseBytes ?? 0) > 0);
      if (withBytes.length === 0) return Infinity;
      return withBytes.reduce((s, e) => s + (e.avgResponseBytes ?? 0), 0) / withBytes.length;
    };
    const sorted = [...withSize].sort((a, b) => avgSize(a) - avgSize(b));
    const smallest = sorted[0];
    const largest = sorted[sorted.length - 1];
    const smallBytes = avgSize(smallest);
    const largeBytes = avgSize(largest);
    if (largeBytes - smallBytes > 1024 && smallBytes !== Infinity) {
      insights.push({
        type: 'info',
        title: 'Response Size Comparison',
        text: `"${smallest.config.name}" returns smaller average responses (${formatBytes(smallBytes)}) compared to "${largest.config.name}" (${formatBytes(largeBytes)}) — more efficient for bandwidth-constrained clients.`,
        note: 'Average response size is computed across all endpoints that returned a Content-Length header or had body drain enabled.',
      });
    }
  }

  return insights;
}

interface Props {
  runs: TestRun[];
}

export function CompareInsights({ runs }: Props) {
  const [open, setOpen] = useState(false);
  const insights = buildInsights(runs);
  if (insights.length === 0) return null;

  return (
    <div className="card">
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '14px var(--card-pad)',
          background: 'transparent',
          border: 'none',
          borderBottom: open ? '1px solid var(--line)' : 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="card__title">Comparison Insights</span>
          <span style={{
            fontSize: 11,
            fontWeight: 500,
            color: 'var(--fg-3)',
            background: 'var(--bg-2)',
            border: '1px solid var(--line)',
            borderRadius: 10,
            padding: '1px 7px',
          }}>
            {insights.length}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--fg-3)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Auto-generated
          </span>
          <svg
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            style={{ color: 'var(--fg-3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          >
            <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>
      {open && (
      <div className="card__body" style={{ padding: '10px 14px 14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {insights.map((ins, i) => {
            const s = TYPE_STYLE[ins.type];
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 12,
                  padding: '11px 14px',
                  background: s.bg,
                  border: `1px solid ${s.border}`,
                  borderLeft: `3px solid ${s.color}`,
                  borderRadius: 'var(--radius-sm)',
                }}
              >
                {/* Icon */}
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

                {/* Content */}
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
            );
          })}
        </div>
      </div>
      )}
    </div>
  );
}

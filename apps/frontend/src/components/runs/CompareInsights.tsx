import { formatLatency, formatRps, formatErrorRate, formatBytes } from '@/lib/formatters';
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

function buildInsights(runs: TestRun[]): Insight[] {
  const valid = runs.filter((r) => r.metrics != null);
  if (valid.length < 2) return [];

  const insights: Insight[] = [];

  // Fastest at p95
  const byP95 = [...valid].sort((a, b) => a.metrics!.p95 - b.metrics!.p95);
  const fastestP95 = byP95[0];
  const slowestP95 = byP95[byP95.length - 1];
  if (fastestP95.id !== slowestP95.id) {
    const pct = ((slowestP95.metrics!.p95 - fastestP95.metrics!.p95) / slowestP95.metrics!.p95 * 100).toFixed(0);
    insights.push({
      type: 'ok',
      text: `${fastestP95.config.name} has the lowest p95 latency (${formatLatency(fastestP95.metrics!.p95)}) — ${pct}% faster than ${slowestP95.config.name} (${formatLatency(slowestP95.metrics!.p95)}).`,
    });
  }

  // Highest throughput
  const byRps = [...valid].sort((a, b) => b.metrics!.rps - a.metrics!.rps);
  const topRps = byRps[0];
  const botRps = byRps[byRps.length - 1];
  if (topRps.id !== botRps.id) {
    insights.push({
      type: 'info',
      text: `Highest throughput: ${topRps.config.name} at ${formatRps(topRps.metrics!.rps)} — vs ${formatRps(botRps.metrics!.rps)} for ${botRps.config.name}.`,
    });
  } else {
    insights.push({ type: 'info', text: `All runs achieved similar throughput around ${formatRps(topRps.metrics!.rps)}.` });
  }

  // Error rates
  const allZero = valid.every((r) => r.metrics!.errorRate === 0);
  const allUnder1 = valid.every((r) => r.metrics!.errorRate < 0.01);
  const worstErr = [...valid].sort((a, b) => b.metrics!.errorRate - a.metrics!.errorRate)[0];

  if (allZero) {
    insights.push({ type: 'ok', text: 'All runs recorded zero errors — excellent reliability across the board.' });
  } else if (allUnder1) {
    insights.push({ type: 'ok', text: `All runs stayed under 1% error rate — solid reliability across the board.` });
  } else {
    insights.push({
      type: 'warn',
      text: `${worstErr.config.name} has the highest error rate (${formatErrorRate(worstErr.metrics!.errorRate)}). Review its status code breakdown to determine the failure mode.`,
    });
  }

  // Tail latency consistency (p99 / p50 spread)
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
        text: `${widest.name} has the widest tail — p99 is ${widest.spread.toFixed(1)}× its median, suggesting latency spikes. ${tightest.name} is the most consistent at ${tightest.spread.toFixed(1)}× median.`,
      });
    } else {
      insights.push({
        type: 'info',
        text: `Tail consistency — ${tightest.name} is tightest (p99 is ${tightest.spread.toFixed(1)}× median) while ${widest.name} is widest (${widest.spread.toFixed(1)}×). All runs show acceptable variance.`,
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
        text: `${fastTtfb.config.name} has the lowest avg TTFB (${formatLatency(fastTtfb.metrics!.avgTtfbMs ?? 0)}) — ${formatLatency(diff)} faster server response than ${slowTtfb.config.name} (${formatLatency(slowTtfb.metrics!.avgTtfbMs ?? 0)}).`,
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
        text: `${smallest.config.name} returns smaller average responses (${formatBytes(smallBytes)}) vs ${largest.config.name} (${formatBytes(largeBytes)}) — better for bandwidth-constrained clients.`,
      });
    }
  }

  return insights;
}

interface Props {
  runs: TestRun[];
}

export function CompareInsights({ runs }: Props) {
  const insights = buildInsights(runs);
  if (insights.length === 0) return null;

  return (
    <div className="card">
      <div className="card__head">
        <div className="card__title">Comparison Insights</div>
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

import { formatLatency } from '@/lib/formatters';
import type { EndpointStats } from '@api-perf/shared';

interface Props {
  endpoints: EndpointStats[];
}

export function LatencyBreakdownChart({ endpoints }: Props) {
  const withTtfb = endpoints.filter((e) => e.avgTtfbMs != null && e.avgLatency > 0);
  if (withTtfb.length === 0) return <p className="dim" style={{ fontSize: 12 }}>TTFB data not available for this run.</p>;

  const sorted = [...withTtfb].sort((a, b) => b.avgLatency - a.avgLatency).slice(0, 8);
  const maxLatency = sorted[0]?.avgLatency ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map((e, i) => {
        const ttfb = e.avgTtfbMs ?? 0;
        const body = Math.max(0, e.avgLatency - ttfb);
        const ttfbPct = (ttfb / maxLatency) * 100;
        const bodyPct = (body / maxLatency) * 100;
        const label = `${e.method} ${e.url.length > 35 ? e.url.slice(0, 34) + '…' : e.url}`;

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 200, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {label}
            </div>
            <div style={{ flex: 1, height: 16, display: 'flex', background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div
                title={`TTFB: ${formatLatency(ttfb)}`}
                style={{ width: `${ttfbPct}%`, height: '100%', background: 'var(--accent)', opacity: 0.85, transition: 'width 0.4s' }}
              />
              <div
                title={`Body download: ${formatLatency(body)}`}
                style={{ width: `${bodyPct}%`, height: '100%', background: 'var(--info)', opacity: 0.5, transition: 'width 0.4s' }}
              />
            </div>
            <div style={{ width: 60, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, flexShrink: 0 }}>
              {formatLatency(e.avgLatency)}
            </div>
          </div>
        );
      })}
      <div className="legend" style={{ marginTop: 4 }}>
        <span><span className="legend__swatch" style={{ background: 'var(--accent)' }} />TTFB</span>
        <span><span className="legend__swatch" style={{ background: 'var(--info)', opacity: 0.7 }} />Body download</span>
      </div>
    </div>
  );
}

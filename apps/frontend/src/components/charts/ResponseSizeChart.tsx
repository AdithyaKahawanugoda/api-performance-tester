import { formatBytes } from '@/lib/formatters';
import type { EndpointStats } from '@api-perf/shared';

interface Props {
  endpoints: EndpointStats[];
}

export function ResponseSizeChart({ endpoints }: Props) {
  const withSize = endpoints
    .filter((e) => (e.avgResponseBytes ?? 0) > 0)
    .sort((a, b) => (b.avgResponseBytes ?? 0) - (a.avgResponseBytes ?? 0))
    .slice(0, 8);

  if (withSize.length === 0) {
    return <p className="dim" style={{ fontSize: 12 }}>Response size data not available. Enable &quot;Capture Response Size&quot; in the config to measure it.</p>;
  }

  const max = withSize[0]?.avgResponseBytes ?? 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {withSize.map((e, i) => {
        const bytes = e.avgResponseBytes ?? 0;
        const pct = (bytes / max) * 100;
        const label = `${e.method} ${e.url.length > 35 ? e.url.slice(0, 34) + '…' : e.url}`;

        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 200, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--fg-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {label}
            </div>
            <div style={{ flex: 1, height: 16, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: `${pct}%`, height: '100%',
                background: bytes > 50_000 ? 'var(--warn)' : bytes > 10_000 ? 'var(--info)' : 'var(--ok)',
                opacity: 0.85,
                transition: 'width 0.4s',
              }} />
            </div>
            <div style={{ width: 64, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11.5, flexShrink: 0 }}>
              {formatBytes(bytes)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

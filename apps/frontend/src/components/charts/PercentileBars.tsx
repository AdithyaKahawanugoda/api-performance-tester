interface Row {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  rows: Row[];
}

export function PercentileBars({ rows }: Props) {
  if (rows.length === 0) return null;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {rows.map((r, i) => {
        const pct = (r.value / max) * 100;
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>
              {r.label}
            </div>
            <div style={{ flex: 1, height: 18, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                width: pct + '%',
                height: '100%',
                background: r.color ?? 'var(--accent)',
                opacity: 0.85,
                transition: 'width 0.4s',
              }} />
            </div>
            <div style={{ width: 64, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>
              {r.value} <span style={{ color: 'var(--fg-3)' }}>ms</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

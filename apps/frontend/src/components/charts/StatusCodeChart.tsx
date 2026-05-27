interface Props {
  distribution: Record<string, number>;
  size?: number;
  thickness?: number;
}

function getColor(code: string): string {
  const n = parseInt(code, 10);
  if (n >= 200 && n < 300) return 'var(--ok)';
  if (n >= 300 && n < 400) return 'var(--info)';
  if (n >= 400 && n < 500) return 'var(--warn)';
  if (n >= 500) return 'var(--err)';
  return 'var(--fg-3)';
}

export function StatusCodeChart({ distribution, size = 140, thickness = 22 }: Props) {
  const entries = Object.entries(distribution);
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (total === 0) return null;

  const r = size / 2 - thickness / 2;
  const cx = size / 2, cy = size / 2;
  let angle = -Math.PI / 2;

  const arcs = entries.map(([code, count]) => {
    const frac = count / total;
    const a2 = angle + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    const x2 = cx + r * Math.cos(a2),    y2 = cy + r * Math.sin(a2);
    angle = a2;
    return {
      d: `M${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)}`,
      color: getColor(code),
      code,
      count,
    };
  });

  const totalK = total >= 1000 ? (total / 1000).toFixed(1) + 'k' : String(total);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <svg width={size} height={size} className="chart" style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={r} stroke="var(--bg-2)" strokeWidth={thickness} fill="none" />
        {arcs.map((a, i) => (
          <path key={i} d={a.d} stroke={a.color} strokeWidth={thickness} fill="none" strokeLinecap="butt" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--fg-0)" fontSize="18" fontWeight="600" fontFamily="var(--font-mono)">
          {totalK}
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill="var(--fg-2)" fontSize="10" letterSpacing="0.06em">REQS</text>
      </svg>
      <div className="donut__legend">
        {arcs.map((a) => (
          <div key={a.code} className="donut__row">
            <div className="sw" style={{ background: a.color }} />
            <span className="mono dim">{a.code}</span>
            <span className="num" style={{ marginLeft: 'auto', color: 'var(--fg-1)' }}>{a.count.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

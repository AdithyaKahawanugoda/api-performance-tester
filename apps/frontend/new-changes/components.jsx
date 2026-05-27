/* Shared components: Icon, Sparkline, KPI, Badges, charts, etc. */
/* global React */

const { useEffect, useMemo, useRef, useState } = React;

const Icon = ({ name, size = 14, stroke = 1.5, className = '', style }) => {
  const path = window.AppData.ICONS[name];
  if (!path) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={'ico ' + className}
      style={style}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  );
};

/* ─────────────────────────────────────────── Sparkline */
const Sparkline = ({ data, width = 80, height = 28, color = 'var(--accent)', fill = true }) => {
  if (!data || data.length === 0) return null;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pad = 2;
  const stepX = (width - pad * 2) / (data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - lo) / (hi - lo || 1));
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ width, height, flex: '0 0 auto', display: 'block' }}>
      {fill && <path d={area} fill={color} opacity="0.10" />}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={color} />
    </svg>
  );
};

/* ─────────────────────────────────────────── KPI */
const KPI = ({ label, value, unit, delta, deltaDirection, spark, sparkColor, live, sub }) => (
  <div className={'kpi ' + (live ? 'is-live' : '')}>
    <div className="kpi__label">{label}</div>
    <div className="kpi__value num">
      {value}
      {unit && <span className="kpi__unit">{unit}</span>}
    </div>
    <div className="kpi__meta">
      {delta && (
        <span className={'trend ' + (deltaDirection === 'up' ? 'up' : 'down')}>
          {deltaDirection === 'up' ? '↑' : '↓'} {delta}
        </span>
      )}
      {sub && <span>{sub}</span>}
    </div>
    {spark && (
      <div className="kpi__spark">
        <Sparkline data={spark} color={sparkColor || 'var(--accent)'} />
      </div>
    )}
  </div>
);

/* ─────────────────────────────────────────── Status badge */
const STATUS_MAP = {
  running:   { cls: 'badge--run',  label: 'Running' },
  queued:    { cls: 'badge--warn', label: 'Queued' },
  completed: { cls: 'badge--ok',   label: 'Completed' },
  failed:    { cls: 'badge--err',  label: 'Failed' },
  cancelled: { cls: '',            label: 'Cancelled' },
  idle:      { cls: '',            label: 'Idle' },
};
const RunStatus = ({ status }) => {
  const s = STATUS_MAP[status] || STATUS_MAP.idle;
  return (
    <span className={'badge ' + s.cls}>
      <span className="ddot" />
      {s.label}
    </span>
  );
};

const Method = ({ children }) => (
  <span className={'method method--' + children}>{children}</span>
);

/* ─────────────────────────────────────────── Multi-line chart */
const LineChart = ({ series, width = 800, height = 220, yLabel, animate = false, tick = 0 }) => {
  // series: [{ name, color, data: number[] }]
  const padL = 38, padR = 14, padT = 14, padB = 24;
  const allValues = series.flatMap((s) => s.data);
  const maxY = Math.max(...allValues) * 1.1 || 1;
  const minY = 0;
  const len = Math.max(...series.map((s) => s.data.length));
  const stepX = (width - padL - padR) / Math.max(1, len - 1);

  const yScale = (v) => padT + (height - padT - padB) * (1 - (v - minY) / (maxY - minY));
  const xScale = (i) => padL + i * stepX;

  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => (maxY / gridLines) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid" x1={padL} x2={width - padR} y1={yScale(t)} y2={yScale(t)} />
          <text className="axis" x={padL - 6} y={yScale(t) + 3} textAnchor="end">{Math.round(t)}</text>
        </g>
      ))}
      {/* x axis labels */}
      {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
        const x = padL + (width - padL - padR) * p;
        const lbl = `t-${Math.round((1 - p) * (animate ? tick : len - 1))}s`;
        return <text key={i} className="axis" x={x} y={height - 6} textAnchor="middle">{lbl}</text>;
      })}
      {series.map((s, idx) => {
        const d = s.data.map((v, i) => (i === 0 ? `M${xScale(i)},${yScale(v)}` : `L${xScale(i)},${yScale(v)}`)).join(' ');
        return (
          <g key={idx}>
            <path d={d} stroke={s.color} className="line" />
            {s.data.length > 0 && (
              <circle cx={xScale(s.data.length - 1)} cy={yScale(s.data[s.data.length - 1])} r="2.5" fill={s.color} />
            )}
          </g>
        );
      })}
      {yLabel && <text className="axis" x={padL} y={padT - 4} fill="var(--fg-2)">{yLabel}</text>}
    </svg>
  );
};

/* ─────────────────────────────────────────── Bar chart (comparison) */
const BarGroupChart = ({ groups, series, width = 800, height = 220 }) => {
  // groups: ['p50','p95','p99']; series: [{ name, color, values: [n,n,n] }]
  const padL = 40, padR = 14, padT = 14, padB = 28;
  const max = Math.max(...series.flatMap((s) => s.values)) * 1.15 || 1;
  const groupW = (width - padL - padR) / groups.length;
  const barW = (groupW - 12) / series.length;
  const yScale = (v) => padT + (height - padT - padB) * (1 - v / max);
  const gridLines = 4;
  const ticks = Array.from({ length: gridLines + 1 }, (_, i) => (max / gridLines) * i);

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="chart">
      {ticks.map((t, i) => (
        <g key={i}>
          <line className="grid" x1={padL} x2={width - padR} y1={yScale(t)} y2={yScale(t)} />
          <text className="axis" x={padL - 6} y={yScale(t) + 3} textAnchor="end">{Math.round(t)}</text>
        </g>
      ))}
      {groups.map((g, gi) => {
        const groupX = padL + gi * groupW + 6;
        return (
          <g key={gi}>
            <text className="axis" x={groupX + (groupW - 12) / 2} y={height - 8} textAnchor="middle" fill="var(--fg-1)">{g}</text>
            {series.map((s, si) => {
              const v = s.values[gi];
              const x = groupX + si * barW;
              const y = yScale(v);
              const h = height - padB - y;
              return (
                <g key={si}>
                  <rect x={x + 1} y={y} width={barW - 2} height={h} fill={s.color} rx="1" />
                  <text className="axis" x={x + barW / 2} y={y - 4} textAnchor="middle" fill="var(--fg-1)">{Math.round(v)}</text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

/* ─────────────────────────────────────────── Donut */
const Donut = ({ data, size = 140, thickness = 22 }) => {
  const r = size / 2 - thickness / 2;
  const cx = size / 2, cy = size / 2;
  const total = data.reduce((s, d) => s + d.count, 0);
  let a = -Math.PI / 2;
  const arcs = data.map((d) => {
    const frac = d.count / total;
    const a2 = a + frac * Math.PI * 2;
    const large = frac > 0.5 ? 1 : 0;
    const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    a = a2;
    return { d: `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2}`, color: d.color };
  });
  return (
    <svg width={size} height={size} className="chart">
      <circle cx={cx} cy={cy} r={r} stroke="var(--bg-2)" strokeWidth={thickness} fill="none" />
      {arcs.map((a, i) => <path key={i} d={a.d} stroke={a.color} strokeWidth={thickness} fill="none" strokeLinecap="butt" />)}
      <text x={cx} y={cy - 4} textAnchor="middle" fill="var(--fg-0)" fontSize="20" fontWeight="600" fontFamily="var(--font-mono)">
        {(total / 1000).toFixed(1)}k
      </text>
      <text x={cx} y={cy + 13} textAnchor="middle" fill="var(--fg-2)" fontSize="10" letterSpacing="0.06em">REQUESTS</text>
    </svg>
  );
};

/* ─────────────────────────────────────────── Percentile bars (histogram style) */
const PercentileBars = ({ rows }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
    {rows.map((r, i) => {
      const max = Math.max(...rows.map(x => x.value));
      const pct = (r.value / max) * 100;
      return (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 32, fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-2)' }}>{r.label}</div>
          <div style={{ flex: 1, height: 18, background: 'var(--bg-2)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              width: pct + '%',
              height: '100%',
              background: r.color || 'var(--accent)',
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

/* ─────────────────────────────────────────── Live status code distribution mini */
const StatusStrip = ({ codes }) => {
  const total = codes.reduce((s, c) => s + c.count, 0);
  return (
    <div style={{ display: 'flex', height: 8, borderRadius: 3, overflow: 'hidden', background: 'var(--bg-2)' }}>
      {codes.map((c, i) => (
        <div key={i} style={{ width: (c.count / total) * 100 + '%', background: c.color }} title={`${c.code}: ${c.count}`} />
      ))}
    </div>
  );
};

Object.assign(window, {
  Icon, Sparkline, KPI, RunStatus, Method,
  LineChart, BarGroupChart, Donut, PercentileBars, StatusStrip,
});

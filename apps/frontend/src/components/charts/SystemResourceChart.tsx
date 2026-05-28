import type { RunWindow } from '@api-perf/shared';

interface Props {
  windows: RunWindow[];
  height?: number;
}

export function SystemResourceChart({ windows, height = 160 }: Props) {
  const withData = windows.filter((w) => w.cpuPercent != null || w.memoryMb != null);
  if (withData.length < 2) {
    return <p className="dim" style={{ fontSize: 12 }}>System resource data not available for this run.</p>;
  }

  const W = 800;
  const padL = 44, padR = 44, padT = 14, padB = 24;
  const len = withData.length;
  const stepX = len > 1 ? (W - padL - padR) / (len - 1) : 1;
  const xScale = (i: number) => padL + i * stepX;

  const cpuData  = withData.map((w) => w.cpuPercent  ?? 0);
  const memData  = withData.map((w) => w.memoryMb    ?? 0);

  const maxMem = Math.max(...memData, 1) * 1.15;
  const yCpu  = (v: number) => padT + (height - padT - padB) * (1 - v / 100);
  const yMem  = (v: number) => padT + (height - padT - padB) * (1 - v / maxMem);

  const cpuPath = cpuData.map((v, i) => (i === 0 ? `M${xScale(i)},${yCpu(v)}` : `L${xScale(i)},${yCpu(v)}`)).join(' ');
  const memPath = memData.map((v, i) => (i === 0 ? `M${xScale(i)},${yMem(v)}` : `L${xScale(i)},${yMem(v)}`)).join(' ');

  const cpuTicks = [0, 25, 50, 75, 100];
  const memTicks = Array.from({ length: 5 }, (_, i) => (maxMem / 4) * i);

  return (
    <div className="stack-sm">
      <svg width="100%" viewBox={`0 0 ${W} ${height}`} className="chart">
        {cpuTicks.map((t, i) => (
          <g key={i}>
            <line className="grid" x1={padL} x2={W - padR} y1={yCpu(t)} y2={yCpu(t)} />
            <text className="axis" x={padL - 6} y={yCpu(t) + 3} textAnchor="end">{t}%</text>
          </g>
        ))}
        {memTicks.map((t, i) => (
          <text key={i} className="axis" x={W - padR + 6} y={yMem(t) + 3} textAnchor="start">{Math.round(t)}MB</text>
        ))}
        {cpuData.length > 0 && <path d={cpuPath} stroke="var(--warn)" className="line" />}
        {memData.length > 0 && <path d={memPath} stroke="var(--info)" className="line" strokeDasharray="4 2" />}
        <circle cx={xScale(cpuData.length - 1)} cy={yCpu(cpuData[cpuData.length - 1] ?? 0)} r="2.5" fill="var(--warn)" />
        <circle cx={xScale(memData.length - 1)} cy={yMem(memData[memData.length - 1] ?? 0)} r="2.5" fill="var(--info)" />
      </svg>
      <div className="legend">
        <span><span className="legend__swatch" style={{ background: 'var(--warn)' }} />CPU %</span>
        <span><span className="legend__swatch" style={{ background: 'var(--info)' }} />Memory (MB)</span>
      </div>
    </div>
  );
}

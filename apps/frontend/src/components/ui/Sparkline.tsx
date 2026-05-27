interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export function Sparkline({ data, width = 80, height = 28, color = 'var(--accent)', fill = true }: SparklineProps) {
  if (!data || data.length === 0) return null;
  const lo = Math.min(...data);
  const hi = Math.max(...data);
  const pad = 2;
  const stepX = (width - pad * 2) / Math.max(1, data.length - 1);
  const pts = data.map((v, i) => {
    const x = pad + i * stepX;
    const y = pad + (height - pad * 2) * (1 - (v - lo) / (hi - lo || 1));
    return [x, y] as [number, number];
  });
  const d = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(' ');
  const area = `${d} L${pts[pts.length - 1][0]},${height} L${pts[0][0]},${height} Z`;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ width, height, flex: '0 0 auto', display: 'block' }}
    >
      {fill && <path d={area} fill={color} opacity="0.10" />}
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill={color} />
    </svg>
  );
}

import { Sparkline } from './Sparkline';

interface KPIProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: string;
  deltaDirection?: 'up' | 'down';
  spark?: number[];
  sparkColor?: string;
  live?: boolean;
  sub?: string;
}

export function KPI({ label, value, unit, delta, deltaDirection, spark, sparkColor, live, sub }: KPIProps) {
  return (
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
          <Sparkline data={spark} color={sparkColor ?? 'var(--accent)'} />
        </div>
      )}
    </div>
  );
}

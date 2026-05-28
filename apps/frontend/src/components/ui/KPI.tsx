import { Sparkline } from './Sparkline';
import { InfoTooltip } from '@/components/shared/InfoTooltip';

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
  info?: string;
}

export function KPI({ label, value, unit, delta, deltaDirection, spark, sparkColor, live, sub, info }: KPIProps) {
  return (
    <div className={'kpi ' + (live ? 'is-live' : '')}>
      <div className="kpi__label" style={info ? { display: 'flex', alignItems: 'center', gap: 4 } : {}}>
        {label}
        {info && <InfoTooltip text={info} />}
      </div>
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

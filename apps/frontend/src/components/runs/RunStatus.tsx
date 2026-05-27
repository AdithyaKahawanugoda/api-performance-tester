const STATUS_MAP: Record<string, { cls: string; label: string }> = {
  running:   { cls: 'badge--run',  label: 'Running' },
  queued:    { cls: 'badge--warn', label: 'Queued' },
  completed: { cls: 'badge--ok',   label: 'Completed' },
  failed:    { cls: 'badge--err',  label: 'Failed' },
  cancelled: { cls: '',            label: 'Cancelled' },
  idle:      { cls: '',            label: 'Idle' },
};

interface RunStatusProps {
  status: string;
}

export function RunStatus({ status }: RunStatusProps) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.idle;
  return (
    <span className={'badge ' + s.cls}>
      <span className="ddot" />
      {s.label}
    </span>
  );
}

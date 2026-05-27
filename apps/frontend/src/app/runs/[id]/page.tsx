'use client';

import { useParams } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { RunStatus } from '@/components/runs/RunStatus';
import { LiveRunView } from '@/components/runs/LiveRunView';
import { RunResultView } from '@/components/runs/RunResultView';
import { Icon } from '@/components/ui/Icon';
import { useRun, useCancelRun } from '@/hooks/useRuns';
import { useRunStore } from '@/store/runStore';
import { formatDateTime } from '@/lib/formatters';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading } = useRun(id);
  const { mutateAsync: cancelRun, isPending: isCancelling } = useCancelRun();
  const liveStatus = useRunStore((s) => s.runStatuses[id]);

  if (isLoading) return (
    <div className="page">
      <div className="card shimmer" style={{ height: 400 }} />
    </div>
  );
  if (!run) return (
    <div className="page">
      <div className="empty">
        <p className="empty__title">Run not found</p>
        <p className="empty__sub">This run ID does not exist or was deleted.</p>
      </div>
    </div>
  );

  const status = liveStatus ?? run.status;
  const isActive = status === 'running' || status === 'queued';

  return (
    <div className="page">
      <PageHead
        title={run.config.name}
        sub={run.startedAt ? `Started ${formatDateTime(run.startedAt)}` : (run.createdAt ? `Created ${formatDateTime(run.createdAt)}` : undefined)}
        actions={
          <div className="row">
            <RunStatus status={status} />
            {isActive && (
              <button
                className="btn btn--danger"
                disabled={isCancelling}
                onClick={() => cancelRun(id)}
              >
                <Icon name="stop" size={13} />
                {isCancelling ? 'Cancelling…' : 'Cancel'}
              </button>
            )}
          </div>
        }
      />

      {isActive && <LiveRunView runId={id} />}
      {(status === 'completed' || status === 'failed') && <RunResultView run={run} />}
      {status === 'cancelled' && (
        <div className="empty">
          <p className="empty__title">Run cancelled</p>
          <p className="empty__sub">This run was cancelled before completing.</p>
        </div>
      )}
      {run.error && (
        <div style={{
          marginTop: 16,
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'color-mix(in oklch, var(--err) 10%, var(--bg-1))',
          border: '1px solid color-mix(in oklch, var(--err) 30%, var(--line))',
          color: 'var(--err)',
          fontSize: 12.5,
        }}>
          Error: {run.error}
        </div>
      )}
    </div>
  );
}

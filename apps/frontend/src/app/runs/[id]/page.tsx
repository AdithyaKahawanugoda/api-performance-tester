'use client';

import { useParams, useRouter } from 'next/navigation';
import { StopCircle } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { RunStatusBadge } from '@/components/runs/RunStatusBadge';
import { LiveRunView } from '@/components/runs/LiveRunView';
import { RunResultView } from '@/components/runs/RunResultView';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useRun, useCancelRun } from '@/hooks/useRuns';
import { formatDateTime } from '@/lib/formatters';

export default function RunDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading } = useRun(id);
  const { mutateAsync: cancelRun, isPending: isCancelling } = useCancelRun();
  const router = useRouter();

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  if (!run) return <div className="p-6 text-muted-foreground">Run not found</div>;

  const isActive = run.status === 'running' || run.status === 'queued';

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title={run.config.name} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <RunStatusBadge status={run.status} />
          <span className="text-sm text-muted-foreground">
            {run.startedAt ? `Started ${formatDateTime(run.startedAt)}` : `Created ${run.createdAt ? formatDateTime(run.createdAt) : '—'}`}
          </span>
        </div>
        <div className="flex gap-2">
          {isActive && (
            <Button
              variant="destructive"
              size="sm"
              className="gap-2"
              disabled={isCancelling}
              onClick={() => cancelRun(id)}
            >
              <StopCircle className="h-4 w-4" />
              {isCancelling ? 'Cancelling...' : 'Cancel'}
            </Button>
          )}
        </div>
      </div>

      {isActive && <LiveRunView runId={id} />}
      {(run.status === 'completed' || run.status === 'failed') && <RunResultView run={run} />}
      {run.status === 'cancelled' && <p className="text-muted-foreground">This run was cancelled.</p>}
      {run.status === 'failed' && run.error && (
        <div className="rounded border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Error: {run.error}
        </div>
      )}
    </div>
  );
}

import { Badge } from '@/components/ui/badge';
import type { TestStatus } from '@api-perf/shared';

const statusConfig: Record<TestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  idle: { label: 'Idle', variant: 'secondary' },
  queued: { label: 'Queued', variant: 'warning' },
  running: { label: 'Running', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

export function RunStatusBadge({ status }: { status: TestStatus }) {
  const config = statusConfig[status] ?? statusConfig.idle;
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

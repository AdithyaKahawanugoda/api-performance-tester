'use client';

import { useParams, useRouter } from 'next/navigation';
import { Play, Trash2 } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { ConfigForm } from '@/components/configs/ConfigForm';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useConfig, useUpdateConfig, useDeleteConfig } from '@/hooks/useConfigs';
import { useStartRun } from '@/hooks/useRuns';
import type { UpdateTestConfigInput } from '@api-perf/shared';

export default function ConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: config, isLoading } = useConfig(id);
  const { mutateAsync: updateConfig, isPending: isUpdating } = useUpdateConfig(id);
  const { mutateAsync: deleteConfig } = useDeleteConfig();
  const { mutateAsync: startRun } = useStartRun();

  async function handleRun() {
    const run = await startRun(id);
    router.push(`/runs/${run.id}`);
  }

  async function handleDelete() {
    if (confirm('Delete this configuration?')) {
      await deleteConfig(id);
      router.push('/configs');
    }
  }

  if (isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
  if (!config) return <div className="p-6 text-muted-foreground">Config not found</div>;

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title={config.name} />
      <div className="flex justify-end gap-2">
        <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete}>
          <Trash2 className="h-4 w-4" />Delete
        </Button>
        <Button className="gap-2" onClick={handleRun}>
          <Play className="h-4 w-4" />Run Test
        </Button>
      </div>
      <ConfigForm
        defaultValues={{ ...config, endpoints: config.endpoints.map((e) => ({ ...e, weight: e.weight ?? 1 })) }}
        onSubmit={(data: UpdateTestConfigInput) => updateConfig(data)}
        isLoading={isUpdating}
      />
    </div>
  );
}

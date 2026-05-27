'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { ConfigForm } from '@/components/configs/ConfigForm';
import { Icon } from '@/components/ui/Icon';
import { useConfig, useUpdateConfig, useDeleteConfig } from '@/hooks/useConfigs';
import { useStartRun } from '@/hooks/useRuns';
import { minDelay } from '@/lib/minDelay';
import type { UpdateTestConfigInput } from '@api-perf/shared';

export default function ConfigDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: config, isLoading } = useConfig(id);
  const { mutateAsync: updateConfig } = useUpdateConfig(id);
  const { mutateAsync: deleteConfig, isPending: isDeleting } = useDeleteConfig();
  const { mutateAsync: startRun, isPending: isStarting } = useStartRun();

  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  async function handleSave(data: UpdateTestConfigInput) {
    setIsSaving(true);
    try {
      await minDelay(updateConfig(data));
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRun() {
    const run = await minDelay(startRun(id));
    router.push(`/runs/${run.id}`);
  }

  async function handleDelete() {
    if (confirm('Delete this configuration?')) {
      await deleteConfig(id);
      router.push('/configs');
    }
  }

  if (isLoading) return (
    <div className="page">
      <div className="card shimmer" style={{ height: 400 }} />
    </div>
  );
  if (!config) return (
    <div className="page">
      <div className="empty">
        <p className="empty__title">Config not found</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      <PageHead
        title={config.name}
        sub={config.description ?? `${config.endpoints.length} endpoint${config.endpoints.length !== 1 ? 's' : ''}`}
        actions={
          <div className="row">
            <button className="btn btn--danger" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <><span className="spinner" /> Deleting…</> : <><Icon name="trash" size={13} /> Delete</>}
            </button>
            <button className="btn btn--primary" onClick={handleRun} disabled={isStarting}>
              {isStarting ? <><span className="spinner" /> Starting…</> : <><Icon name="run" size={13} /> Run Test</>}
            </button>
          </div>
        }
      />
      <ConfigForm
        defaultValues={{ ...config, endpoints: config.endpoints.map((e) => ({ ...e, weight: e.weight ?? 1 })) }}
        onSubmit={handleSave}
        isLoading={isSaving}
        isSaved={isSaved}
      />
    </div>
  );
}

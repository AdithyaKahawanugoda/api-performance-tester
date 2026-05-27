'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { ConfigForm } from '@/components/configs/ConfigForm';
import { useCreateConfig } from '@/hooks/useConfigs';
import { minDelay } from '@/lib/minDelay';
import type { CreateTestConfigInput } from '@api-perf/shared';

export default function NewConfigPage() {
  const router = useRouter();
  const { mutateAsync: createConfig } = useCreateConfig();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(data: CreateTestConfigInput) {
    setIsSaving(true);
    try {
      const config = await minDelay(createConfig(data));
      router.push(`/configs/${config.id}`);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="page">
      <PageHead title="New Configuration" sub="Create a new API load test configuration" />
      <ConfigForm onSubmit={handleSubmit} isLoading={isSaving} />
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { ConfigForm } from '@/components/configs/ConfigForm';
import { useCreateConfig } from '@/hooks/useConfigs';
import type { CreateTestConfigInput } from '@api-perf/shared';

export default function NewConfigPage() {
  const router = useRouter();
  const { mutateAsync: createConfig, isPending } = useCreateConfig();

  async function handleSubmit(data: CreateTestConfigInput) {
    const config = await createConfig(data);
    router.push(`/configs/${config.id}`);
  }

  return (
    <div className="page">
      <PageHead title="New Configuration" sub="Create a new API load test configuration" />
      <ConfigForm onSubmit={handleSubmit} isLoading={isPending} />
    </div>
  );
}

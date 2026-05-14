'use client';

import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
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
    <div className="flex flex-col gap-6 p-6">
      <Header title="New Test Configuration" />
      <ConfigForm onSubmit={handleSubmit} isLoading={isPending} />
    </div>
  );
}

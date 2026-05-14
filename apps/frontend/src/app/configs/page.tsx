'use client';

import Link from 'next/link';
import { Plus, Settings2, Play } from 'lucide-react';
import { Header } from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useConfigs, useDeleteConfig } from '@/hooks/useConfigs';
import { useStartRun } from '@/hooks/useRuns';
import { useRouter } from 'next/navigation';
import { formatRelativeTime } from '@/lib/formatters';

export default function ConfigsPage() {
  const { data, isLoading } = useConfigs();
  const { mutateAsync: deleteConfig } = useDeleteConfig();
  const { mutateAsync: startRun } = useStartRun();
  const router = useRouter();

  async function handleRun(configId: string) {
    const run = await startRun(configId);
    router.push(`/runs/${run.id}`);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="Test Configurations" />
      <div className="flex justify-end">
        <Link href="/configs/new">
          <Button className="gap-2"><Plus className="h-4 w-4" />New Config</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44" />)}
        </div>
      ) : data?.items.length === 0 ? (
        <EmptyState
          title="No configurations yet"
          description="Create your first test configuration to get started."
          action={<Link href="/configs/new"><Button>Create Config</Button></Link>}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data?.items.map((config) => (
            <Card key={config.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="text-base">{config.name}</CardTitle>
                <CardDescription>{config.description ?? `${config.concurrency} workers · ${config.totalRequests} requests`}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {config.tags?.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}
                  <Badge variant="outline" className="text-xs">{config.endpoints.length} endpoint{config.endpoints.length !== 1 ? 's' : ''}</Badge>
                </div>
              </CardContent>
              <CardFooter className="justify-between gap-2">
                <div className="text-xs text-muted-foreground">{config.createdAt ? formatRelativeTime(config.createdAt) : ''}</div>
                <div className="flex gap-2">
                  <Link href={`/configs/${config.id}`}>
                    <Button variant="ghost" size="sm"><Settings2 className="h-4 w-4" /></Button>
                  </Link>
                  <Button size="sm" className="gap-1" onClick={() => handleRun(config.id)}>
                    <Play className="h-4 w-4" />Run
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { OpenApiUpload } from '@/components/import/OpenApiUpload';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCreateConfig } from '@/hooks/useConfigs';
import type { CreateTestConfigInput } from '@api-perf/shared';

export default function ImportPage() {
  const [draft, setDraft] = useState<CreateTestConfigInput | null>(null);
  const { mutateAsync: createConfig, isPending } = useCreateConfig();
  const router = useRouter();

  async function handleSave() {
    if (!draft) return;
    const config = await createConfig(draft);
    router.push(`/configs/${config.id}`);
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Header title="Import OpenAPI Spec" />
      <p className="text-sm text-muted-foreground">
        Upload a JSON or YAML OpenAPI specification to auto-generate a test configuration.
      </p>

      <OpenApiUpload onParsed={setDraft} />

      {draft && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Parsed: {draft.name}</CardTitle>
            <Button onClick={handleSave} disabled={isPending}>
              {isPending ? 'Saving...' : 'Save as Config'}
            </Button>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              {draft.endpoints.length} endpoint{draft.endpoints.length !== 1 ? 's' : ''} extracted
            </p>
            <div className="space-y-2">
              {draft.endpoints.map((ep, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <Badge variant="outline" className="font-mono">{ep.method}</Badge>
                  <span className="truncate font-mono text-muted-foreground">{ep.url}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

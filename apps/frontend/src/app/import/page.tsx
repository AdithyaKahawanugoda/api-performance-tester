'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { Icon } from '@/components/ui/Icon';
import { Method } from '@/components/ui/Method';
import { OpenApiUpload } from '@/components/import/OpenApiUpload';
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
    <div className="page">
      <PageHead
        title="Import OpenAPI"
        sub="Upload a JSON or YAML spec to auto-generate a test configuration"
      />

      <div className="stack-lg">
        <OpenApiUpload onParsed={setDraft} />

        {draft && (
          <div className="card">
            <div className="card__head">
              <div>
                <div className="card__title">Parsed: {draft.name}</div>
                <div className="card__sub">
                  {draft.endpoints.length} endpoint{draft.endpoints.length !== 1 ? 's' : ''} extracted
                </div>
              </div>
              <button className="btn btn--primary" onClick={handleSave} disabled={isPending}>
                <Icon name="download" size={13} />
                {isPending ? 'Saving…' : 'Save as Config'}
              </button>
            </div>
            <div className="card__body">
              <div className="stack-sm">
                {draft.endpoints.map((ep, i) => (
                  <div key={i} className="row">
                    <Method>{ep.method}</Method>
                    <span className="mono dim" style={{ fontSize: 12 }}>{ep.url}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

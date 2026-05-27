'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHead } from '@/components/shared/PageHead';
import { EmptyState } from '@/components/shared/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { useConfigs } from '@/hooks/useConfigs';
import { useStartRun } from '@/hooks/useRuns';
import { formatRelativeTime } from '@/lib/formatters';

export default function ConfigsPage() {
  const [search, setSearch] = useState('');
  const { data, isLoading } = useConfigs();
  const { mutateAsync: startRun } = useStartRun();
  const router = useRouter();

  const configs = (data?.items ?? []).filter((c) =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  async function handleRun(configId: string) {
    const run = await startRun(configId);
    router.push(`/runs/${run.id}`);
  }

  return (
    <div className="page">
      <PageHead
        title="Configurations"
        sub={data ? `${data.total} test configuration${data.total !== 1 ? 's' : ''}` : undefined}
        actions={
          <Link href="/configs/new" className="btn btn--primary">
            <Icon name="plus" size={13} />
            New config
          </Link>
        }
      />

      <div className="stack-lg">
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="search" style={{ width: 280 }}>
            <Icon name="search" size={13} />
            <input
              placeholder="Filter configurations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card shimmer" style={{ height: 160 }} />
            ))}
          </div>
        ) : configs.length === 0 ? (
          <EmptyState
            title={search ? 'No matching configurations' : 'No configurations yet'}
            description={search ? 'Try a different search term.' : 'Create your first test configuration to get started.'}
            action={
              !search ? (
                <Link href="/configs/new" className="btn btn--primary">Create Config</Link>
              ) : undefined
            }
          />
        ) : (
          <div className="grid-3">
            {configs.map((config) => (
              <div key={config.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="card__head">
                  <div style={{ minWidth: 0 }}>
                    <div className="card__title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {config.name}
                    </div>
                    <div className="card__sub">
                      {config.description ?? `${config.concurrency} workers · ${config.totalRequests.toLocaleString()} requests`}
                    </div>
                  </div>
                </div>
                <div className="card__body" style={{ flex: 1 }}>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
                    {config.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
                    <span className="pill">{config.endpoints.length} endpoint{config.endpoints.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div style={{
                  padding: '10px 14px',
                  borderTop: '1px solid var(--line-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}>
                  <span className="dim" style={{ fontSize: 11.5 }}>
                    {config.createdAt ? formatRelativeTime(config.createdAt) : ''}
                  </span>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Link href={`/configs/${config.id}`} className="btn btn--ghost btn--sm">
                      <Icon name="cog" size={12} />
                    </Link>
                    <button className="btn btn--sm btn--primary" onClick={() => handleRun(config.id)}>
                      <Icon name="run" size={12} />
                      Run
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

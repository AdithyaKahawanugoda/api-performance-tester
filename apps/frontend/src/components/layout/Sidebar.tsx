'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUiStore } from '@/store/uiStore';
import { useConfigs } from '@/hooks/useConfigs';
import { useRuns } from '@/hooks/useRuns';
import { Icon } from '@/components/ui/Icon';
import type { IconName } from '@/components/ui/Icon';

interface NavItem {
  href: string;
  icon: IconName;
  label: string;
  countKey?: 'configs' | 'runs';
}

const WORKSPACE_NAV: NavItem[] = [
  { href: '/dashboard', icon: 'home',  label: 'Dashboard' },
  { href: '/configs',   icon: 'cog',   label: 'Configurations', countKey: 'configs' },
  { href: '/runs',      icon: 'run',   label: 'Test Runs',       countKey: 'runs' },
  { href: '/runs/compare', icon: 'cmp', label: 'Compare' },
];

const DATA_NAV: NavItem[] = [
  { href: '/import', icon: 'up', label: 'Import OpenAPI' },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUiStore((s) => s.setSidebarOpen);

  const { data: configsData } = useConfigs();
  const { data: runsData } = useRuns();

  const counts: Record<string, number | undefined> = {
    configs: configsData?.total,
    runs: runsData?.total,
  };

  const allNav = [...WORKSPACE_NAV, ...DATA_NAV];
  const activeHref = allNav
    .filter(({ href }) =>
      href === '/dashboard'
        ? pathname === '/dashboard' || pathname === '/'
        : pathname === href || pathname.startsWith(href + '/'),
    )
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const isActive = (href: string) => href === activeHref;

  return (
    <aside className="side">
      <div className="side__brand">
        <div className="side__mark">P</div>
        <span>PerfTester</span>
      </div>

      <div style={{ padding: '12px 12px 4px' }}>
        <Link href="/configs/new" className="btn btn--primary" style={{ width: '100%', justifyContent: 'center' }}>
          <Icon name="plus" size={13} />
          New test
        </Link>
      </div>

      <div>
        <div className="side__section">Workspace</div>
        <nav className="side__nav">
          {WORKSPACE_NAV.map(({ href, icon, label, countKey }) => {
            const active = isActive(href);
            const count = countKey ? counts[countKey] : undefined;
            return (
              <Link key={href} href={href} className={'side__item ' + (active ? 'is-active' : '')}
                onClick={() => setSidebarOpen(false)}>
                <Icon name={icon} size={14} />
                <span>{label}</span>
                {count != null && <span className="side__count num">{count}</span>}
              </Link>
            );
          })}
        </nav>
      </div>

      <div>
        <div className="side__section">Data</div>
        <nav className="side__nav">
          {DATA_NAV.map(({ href, icon, label }) => {
            const active = isActive(href);
            return (
              <Link key={href} href={href} className={'side__item ' + (active ? 'is-active' : '')}
                onClick={() => setSidebarOpen(false)}>
                <Icon name={icon} size={14} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="side__footer">
        <div style={{
          width: 24, height: 24, borderRadius: 4,
          background: 'var(--bg-3)', display: 'grid', placeItems: 'center',
          color: 'var(--fg-0)', fontWeight: 600, fontSize: 11,
          flexShrink: 0,
        }}>
          AP
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: 'var(--fg-0)', fontSize: 12, fontWeight: 500 }}>Adithya</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--fg-3)' }}>perf · staging</div>
        </div>
        <Icon name="cog" className="dim" size={13} />
      </div>

      {sidebarOpen && (
        <div
          className="scrim"
          style={{ display: 'block' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </aside>
  );
}

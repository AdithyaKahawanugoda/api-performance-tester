'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useWsStore } from '@/store/wsStore';
import { useUiStore } from '@/store/uiStore';
import { Icon } from '@/components/ui/Icon';

const PATH_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  configs:   'Configurations',
  runs:      'Test Runs',
  compare:   'Compare',
  import:    'Import',
  new:       'New',
};

interface Crumb {
  label: string;
  href?: string;
  mono?: boolean;
}

function buildCrumbs(pathname: string): Crumb[] {
  const parts = pathname.replace(/^\//, '').split('/').filter(Boolean);
  if (parts.length === 0) return [{ label: 'Dashboard' }];

  if (parts[0] === 'configs' && parts[1] === 'new') {
    return [
      { label: 'Configurations', href: '/configs' },
      { label: 'New' },
    ];
  }
  if (parts[0] === 'configs' && parts[1]) {
    return [
      { label: 'Configurations', href: '/configs' },
      { label: parts[1], mono: true },
    ];
  }
  if (parts[0] === 'runs' && parts[1] && parts[1] !== 'compare') {
    return [
      { label: 'Test Runs', href: '/runs' },
      { label: parts[1], mono: true },
    ];
  }

  return parts.map((p, i) => ({
    label: PATH_LABELS[p] ?? p,
    href: i < parts.length - 1 ? '/' + parts.slice(0, i + 1).join('/') : undefined,
    mono: false,
  }));
}

export function Topbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const connectionStatus = useWsStore((s) => s.connectionStatus);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  useEffect(() => { setMounted(true); }, []);

  const crumbs = buildCrumbs(pathname);

  const dotClass =
    connectionStatus === 'connected'  ? 'dot' :
    connectionStatus === 'connecting' ? 'dot dot--warn' :
                                        'dot dot--err';

  const connLabel =
    connectionStatus === 'connected'  ? 'Live' :
    connectionStatus === 'connecting' ? 'Connecting' :
                                        'Offline';

  return (
    <header className="topbar">
      <button className="iconbtn hamburger" onClick={toggleSidebar} aria-label="Open menu">
        <Icon name="menu" size={16} />
      </button>

      <div className="crumb">
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {i > 0 && <span className="crumb__sep">/</span>}
            {c.href ? (
              <Link href={c.href} className="crumb__root">{c.label}</Link>
            ) : (
              <span className={'crumb__leaf' + (c.mono ? ' mono' : '')}>{c.label}</span>
            )}
          </span>
        ))}
      </div>

      <div className="topbar__spacer" />

      <div className="topbar__conn-wrap">
        <div className="conn">
          <span className={dotClass} />
          <span>{connLabel}</span>
        </div>
      </div>

      {mounted && (
        <button
          className="iconbtn"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label="Toggle theme"
        >
          <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={14} />
        </button>
      )}
    </header>
  );
}

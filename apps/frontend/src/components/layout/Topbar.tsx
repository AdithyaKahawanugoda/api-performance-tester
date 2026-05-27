'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { useEffect, useRef, useState } from 'react';
import { useWsStore } from '@/store/wsStore';
import { useUiStore } from '@/store/uiStore';
import { Icon } from '@/components/ui/Icon';

const PAGES = [
  { label: 'Dashboard',      sub: 'Overview & recent activity', href: '/' },
  { label: 'Configurations', sub: 'All test configs',           href: '/configs' },
  { label: 'New Config',     sub: 'Create a new test config',   href: '/configs/new' },
  { label: 'Test Runs',      sub: 'Browse all runs',            href: '/runs' },
  { label: 'Compare Runs',   sub: 'Side-by-side comparison',    href: '/runs/compare' },
];

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
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const connectionStatus = useWsStore((s) => s.connectionStatus);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const results = query.trim()
    ? PAGES.filter((p) =>
        p.label.toLowerCase().includes(query.toLowerCase()) ||
        p.sub.toLowerCase().includes(query.toLowerCase()),
      )
    : PAGES;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor((c) => (c + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor((c) => (c - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[cursor]) {
      router.push(results[cursor].href);
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      inputRef.current?.blur();
    }
  }

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

      <div className="topbar__search-wrap">
        <div className="search">
          <Icon name="search" size={13} />
          <input
            ref={inputRef}
            placeholder="Search or jump to…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={handleKeyDown}
          />
          <kbd>⌘K</kbd>
        </div>
        {open && results.length > 0 && (
          <div className="cmd-palette">
            {results.map((r, i) => (
              <Link
                key={r.href}
                href={r.href}
                className={'cmd-item' + (i === cursor ? ' is-active' : '')}
                onClick={() => { setOpen(false); setQuery(''); }}
                onMouseEnter={() => setCursor(i)}
              >
                <span className="cmd-item__label">{r.label}</span>
                <span className="cmd-item__sub">{r.sub}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

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

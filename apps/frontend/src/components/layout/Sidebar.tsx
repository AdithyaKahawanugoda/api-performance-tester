'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, BarChart3, GitCompare, Home, Plus, Settings, Upload, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

const navItems = [
  { href: '/dashboard', icon: Home, label: 'Dashboard' },
  { href: '/configs', icon: Settings, label: 'Configs' },
  { href: '/runs', icon: Activity, label: 'Test Runs' },
  { href: '/runs/compare', icon: GitCompare, label: 'Compare' },
  { href: '/import', icon: Upload, label: 'Import OpenAPI' },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useUiStore((s) => s.sidebarOpen);

  if (!sidebarOpen) return null;

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      <div className="flex h-16 items-center gap-2 px-6">
        <Zap className="h-6 w-6 text-blue-500" />
        <span className="text-lg font-bold tracking-tight">PerfTester</span>
      </div>

      <Separator />

      <div className="px-3 py-2">
        <Link href="/configs/new">
          <Button className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" />
            New Test
          </Button>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href}>
              <div
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50',
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-3 w-3" />
          API Performance Platform
        </div>
      </div>
    </aside>
  );
}

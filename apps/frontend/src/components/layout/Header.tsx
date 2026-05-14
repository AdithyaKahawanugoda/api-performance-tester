'use client';

import { Moon, Sun, Menu } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/uiStore';
import { useWsStore } from '@/store/wsStore';
import { cn } from '@/lib/utils';

export function Header({ title }: { title?: string }) {
  const { theme, setTheme } = useTheme();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const connectionStatus = useWsStore((s) => s.connectionStatus);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border px-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </Button>
        {title && <h1 className="text-lg font-semibold">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              connectionStatus === 'connected' && 'bg-emerald-500',
              connectionStatus === 'connecting' && 'bg-amber-500 animate-pulse',
              connectionStatus === 'disconnected' && 'bg-red-500',
              connectionStatus === 'error' && 'bg-red-500',
            )}
          />
          {connectionStatus === 'connected' ? 'Live' : connectionStatus}
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}

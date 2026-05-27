import type { Metadata } from 'next';
import './design.css';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { WebSocketProvider } from '@/components/providers/WebSocketProvider';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export const metadata: Metadata = {
  title: 'API Performance Tester',
  description: 'Production-grade API load testing and performance analytics platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <QueryProvider>
            <WebSocketProvider>
              <div className="app">
                <Sidebar />
                <div className="scrim" />
                <div className="main">
                  <Topbar />
                  <div className="scroll">
                    {children}
                  </div>
                </div>
              </div>
            </WebSocketProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { getWebSocketClient } from '@/lib/websocket';
import { useRunStore } from '@/store/runStore';
import { useWsStore } from '@/store/wsStore';
import type { ServerToClientEvent } from '@api-perf/shared';

const WebSocketContext = createContext<ReturnType<typeof getWebSocketClient> | null>(null);

export function useWebSocket() {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocket must be used inside WebSocketProvider');
  return ctx;
}

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const ws = getWebSocketClient();
  const { addMetricsWindow, addLogEntry, setRunStatus } = useRunStore();
  const { setStatus, subscribedRuns } = useWsStore();

  useEffect(() => {
    ws.connect();

    const unsubscribe = ws.onMessage((event: ServerToClientEvent) => {
      switch (event.type) {
        case 'METRICS_WINDOW':
          addMetricsWindow(event.payload);
          break;
        case 'REQUEST_LOG':
          addLogEntry(event.payload);
          break;
        case 'RUN_STATUS_CHANGED':
          setRunStatus(event.payload.runId, event.payload.status);
          break;
        case 'RUN_COMPLETED':
          setRunStatus(event.payload.runId, 'completed');
          break;
        case 'RUN_FAILED':
          setRunStatus(event.payload.runId, 'failed');
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [ws, addMetricsWindow, addLogEntry, setRunStatus]);

  useEffect(() => {
    subscribedRuns.forEach((runId) => ws.subscribe(runId));
  }, [ws, subscribedRuns]);

  return <WebSocketContext.Provider value={ws}>{children}</WebSocketContext.Provider>;
}

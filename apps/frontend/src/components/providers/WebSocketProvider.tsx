'use client';

import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
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
  const qc = useQueryClient();

  useEffect(() => {
    ws.onStatusChange(setStatus);
    ws.connect();

    const unsubscribe = ws.onMessage((event: ServerToClientEvent) => {
      switch (event.type) {
        case 'METRICS_WINDOW':
          addMetricsWindow(event.payload);
          break;
        case 'REQUEST_LOG':
          addLogEntry(event.payload);
          break;
        case 'WORKER_PROGRESS':
          // Progress is used by the live view; no store action needed currently.
          break;
        case 'RUN_STATUS_CHANGED':
          setRunStatus(event.payload.runId, event.payload.status);
          void qc.invalidateQueries({ queryKey: ['runs', event.payload.runId] });
          break;
        case 'RUN_COMPLETED':
          setRunStatus(event.payload.runId, 'completed');
          void qc.invalidateQueries({ queryKey: ['runs', event.payload.runId] });
          void qc.invalidateQueries({ queryKey: ['runs'] });
          break;
        case 'RUN_FAILED':
          setRunStatus(event.payload.runId, 'failed');
          void qc.invalidateQueries({ queryKey: ['runs', event.payload.runId] });
          void qc.invalidateQueries({ queryKey: ['runs'] });
          break;
      }
    });

    return () => {
      unsubscribe();
    };
  }, [ws, addMetricsWindow, addLogEntry, setRunStatus, setStatus, qc]);

  // Keep the WS client's internal subscription set in sync with wsStore
  useEffect(() => {
    subscribedRuns.forEach((runId) => ws.subscribe(runId));
  }, [ws, subscribedRuns]);

  return <WebSocketContext.Provider value={ws}>{children}</WebSocketContext.Provider>;
}

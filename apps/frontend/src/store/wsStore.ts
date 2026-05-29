'use client';

import { create } from 'zustand';
import type { ConnectionStatus } from '@/lib/websocket';

interface WsState {
  connectionStatus: ConnectionStatus;
  reconnectAttempt: number;
  subscribedRuns: Set<string>;
  setStatus: (status: ConnectionStatus, attempt?: number) => void;
  addSubscription: (runId: string) => void;
  removeSubscription: (runId: string) => void;
}

export const useWsStore = create<WsState>((set) => ({
  connectionStatus: 'connecting',
  reconnectAttempt: 0,
  subscribedRuns: new Set(),

  setStatus: (connectionStatus, reconnectAttempt = 0) => set({ connectionStatus, reconnectAttempt }),

  addSubscription: (runId) =>
    set((state) => ({ subscribedRuns: new Set([...state.subscribedRuns, runId]) })),

  removeSubscription: (runId) =>
    set((state) => {
      const next = new Set(state.subscribedRuns);
      next.delete(runId);
      return { subscribedRuns: next };
    }),
}));

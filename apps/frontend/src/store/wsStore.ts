'use client';

import { create } from 'zustand';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface WsState {
  connectionStatus: ConnectionStatus;
  subscribedRuns: Set<string>;
  setStatus: (status: ConnectionStatus) => void;
  addSubscription: (runId: string) => void;
  removeSubscription: (runId: string) => void;
}

export const useWsStore = create<WsState>((set) => ({
  connectionStatus: 'disconnected',
  subscribedRuns: new Set(),

  setStatus: (connectionStatus) => set({ connectionStatus }),

  addSubscription: (runId) =>
    set((state) => ({ subscribedRuns: new Set([...state.subscribedRuns, runId]) })),

  removeSubscription: (runId) =>
    set((state) => {
      const next = new Set(state.subscribedRuns);
      next.delete(runId);
      return { subscribedRuns: next };
    }),
}));

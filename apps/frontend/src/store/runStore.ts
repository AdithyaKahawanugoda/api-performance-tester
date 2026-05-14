'use client';

import { create } from 'zustand';
import type { MetricsWindow, RequestLogEntry, TestStatus } from '@api-perf/shared';
import { METRICS_BUFFER_SIZE, REQUEST_LOG_BUFFER_SIZE } from '@api-perf/shared';

interface RunState {
  activeRunId: string | null;
  metricsBuffer: Record<string, MetricsWindow[]>;
  logBuffer: Record<string, RequestLogEntry[]>;
  runStatuses: Record<string, TestStatus>;
  setActiveRun: (runId: string | null) => void;
  addMetricsWindow: (window: MetricsWindow) => void;
  addLogEntry: (entry: RequestLogEntry) => void;
  setRunStatus: (runId: string, status: TestStatus) => void;
  clearRun: (runId: string) => void;
}

export const useRunStore = create<RunState>((set) => ({
  activeRunId: null,
  metricsBuffer: {},
  logBuffer: {},
  runStatuses: {},

  setActiveRun: (runId) => set({ activeRunId: runId }),

  addMetricsWindow: (window) =>
    set((state) => {
      const existing = state.metricsBuffer[window.runId] ?? [];
      const updated = [...existing, window].slice(-METRICS_BUFFER_SIZE);
      return { metricsBuffer: { ...state.metricsBuffer, [window.runId]: updated } };
    }),

  addLogEntry: (entry) =>
    set((state) => {
      const existing = state.logBuffer[entry.runId] ?? [];
      const updated = [entry, ...existing].slice(0, REQUEST_LOG_BUFFER_SIZE);
      return { logBuffer: { ...state.logBuffer, [entry.runId]: updated } };
    }),

  setRunStatus: (runId, status) =>
    set((state) => ({ runStatuses: { ...state.runStatuses, [runId]: status } })),

  clearRun: (runId) =>
    set((state) => {
      const { [runId]: _m, ...metricsBuffer } = state.metricsBuffer;
      const { [runId]: _l, ...logBuffer } = state.logBuffer;
      const { [runId]: _s, ...runStatuses } = state.runStatuses;
      return { metricsBuffer, logBuffer, runStatuses };
    }),
}));

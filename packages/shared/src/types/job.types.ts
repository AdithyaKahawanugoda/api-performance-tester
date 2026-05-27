import type { TestConfig, RunWindow } from './test.types';
import type { RequestLogEntry } from './metrics.types';

export type { RequestLogEntry };

export interface TestJobData {
  runId: string;
  configId: string;
  config: TestConfig;
  workerIndex: number;
  totalWorkers: number;
}

export interface TestJobResult {
  runId: string;
  workerIndex: number;
  totalWorkers: number;
  requestsExecuted: number;
  latencies: number[];
  statusCodes: number[];
  errors: string[];
  urlStats: Record<string, { success: number; failure: number; latencies: number[] }>;
  requestLogs: RequestLogEntry[];
  windows: RunWindow[];
  startedAt: number;
  completedAt: number;
}

export interface JobProgress {
  completed: number;
  total: number;
  workerId: number;
}

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

export interface UrlStat {
  success: number;
  failure: number;
  latencies: number[];
  ttfbs: number[];
  responseSizes: number[];
  cacheHits: number;
  cacheMisses: number;
  serverHeader?: string;
  errorSamples: string[];
}

export interface TestJobResult {
  runId: string;
  workerIndex: number;
  totalWorkers: number;
  requestsExecuted: number;
  latencies: number[];
  statusCodes: number[];
  errors: string[];
  urlStats: Record<string, UrlStat>;
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

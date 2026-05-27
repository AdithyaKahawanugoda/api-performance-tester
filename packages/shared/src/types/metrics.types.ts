import type { HttpMethod } from './test.types';

export interface MetricsWindow {
  runId: string;
  workerIndex: number;
  windowStartMs: number;
  windowEndMs: number;
  requestsInWindow: number;
  successInWindow: number;
  failureInWindow: number;
  rps: number;
  latencies: number[];
  p50: number;
  p95: number;
  p99: number;
}

export interface RequestLogEntry {
  runId: string;
  workerId: number;
  method: HttpMethod;
  url: string;
  statusCode?: number;
  latencyMs: number;
  error?: string;
  timestamp: number;
  requestId: string;
}

export interface TimelineDataPoint {
  timestamp: number;
  rps: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  activeWorkers: number;
}


import type { TestStatus, AggregatedMetrics } from './test.types';
import type { MetricsWindow, RequestLogEntry } from './metrics.types';

export type ServerToClientEvent =
  | { type: 'RUN_STATUS_CHANGED'; payload: { runId: string; status: TestStatus } }
  | { type: 'METRICS_WINDOW'; payload: MetricsWindow }
  | { type: 'REQUEST_LOG'; payload: RequestLogEntry }
  | { type: 'RUN_COMPLETED'; payload: { runId: string; metrics: AggregatedMetrics } }
  | { type: 'RUN_FAILED'; payload: { runId: string; error: string } }
  | { type: 'WORKER_PROGRESS'; payload: { runId: string; workerId: number; completed: number; total: number } };

export type ClientToServerEvent =
  | { type: 'SUBSCRIBE_RUN'; payload: { runId: string } }
  | { type: 'UNSUBSCRIBE_RUN'; payload: { runId: string } }
  | { type: 'CANCEL_RUN'; payload: { runId: string } };

export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
  timestamp: number;
}

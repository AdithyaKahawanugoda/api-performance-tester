import type Redis from 'ioredis';
import { calculatePercentiles } from '@api-perf/shared';
import { REDIS_CHANNELS } from '@api-perf/shared';
import type { MetricsWindow, RequestLogEntry } from '@api-perf/shared';
import type { RequestResult } from './request.executor';

export class MetricsCollector {
  private windowLatencies: number[] = [];
  private windowSuccess = 0;
  private windowFailure = 0;
  private windowStartMs = Date.now();
  private allLatencies: number[] = [];
  private allStatusCodes: number[] = [];
  private allErrors: string[] = [];
  private allLogs: RequestLogEntry[] = [];
  private urlStats: Record<string, { success: number; failure: number; latencies: number[] }> = {};
  private static readonly MAX_LOGS = 1000;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private readonly runId: string,
    private readonly workerIndex: number,
    private readonly redis: Redis,
    private readonly emitIntervalMs: number = 500,
  ) {
    this.flushTimer = setInterval(() => {
      this.emitWindow().catch(() => undefined);
    }, this.emitIntervalMs);
  }

  record(result: RequestResult): void {
    this.allLatencies.push(result.latencyMs);
    this.windowLatencies.push(result.latencyMs);
    this.allStatusCodes.push(result.statusCode);

    const success = result.statusCode >= 200 && result.statusCode < 400 && !result.error;
    if (success) {
      this.windowSuccess++;
    } else {
      this.windowFailure++;
      if (result.error) this.allErrors.push(result.error);
    }

    if (this.allLogs.length < MetricsCollector.MAX_LOGS) {
      this.allLogs.push({
        runId: this.runId,
        workerId: this.workerIndex,
        method: result.method as RequestLogEntry['method'],
        url: result.url,
        statusCode: result.statusCode,
        latencyMs: result.latencyMs,
        error: result.error,
        timestamp: Date.now(),
        requestId: `${this.runId}:${this.workerIndex}:${this.allLatencies.length}`,
      });
    }

    const key = `${result.method}:${result.url}`;
    if (!this.urlStats[key]) this.urlStats[key] = { success: 0, failure: 0, latencies: [] };
    this.urlStats[key].latencies.push(result.latencyMs);
    if (success) this.urlStats[key].success++; else this.urlStats[key].failure++;
  }

  private async emitWindow(): Promise<void> {
    if (this.windowLatencies.length === 0) return;

    const now = Date.now();
    const durationMs = now - this.windowStartMs;
    const percentiles = calculatePercentiles(this.windowLatencies);

    const window: MetricsWindow = {
      runId: this.runId,
      workerIndex: this.workerIndex,
      windowStartMs: this.windowStartMs,
      windowEndMs: now,
      requestsInWindow: this.windowLatencies.length,
      successInWindow: this.windowSuccess,
      failureInWindow: this.windowFailure,
      rps: durationMs > 0 ? (this.windowLatencies.length / durationMs) * 1000 : 0,
      latencies: [...this.windowLatencies],
      ...percentiles,
    };

    const channel = REDIS_CHANNELS.METRICS_WINDOW(this.runId);
    await this.redis.publish(
      channel,
      JSON.stringify({ type: 'METRICS_WINDOW', payload: window, timestamp: now }),
    );

    this.windowLatencies = [];
    this.windowSuccess = 0;
    this.windowFailure = 0;
    this.windowStartMs = now;
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.emitWindow();
  }

  getLatencies(): number[] { return this.allLatencies; }
  getStatusCodes(): number[] { return this.allStatusCodes; }
  getErrors(): string[] { return this.allErrors; }
  getLogs(): RequestLogEntry[] { return this.allLogs; }
  getUrlStats(): MetricsCollector['urlStats'] { return this.urlStats; }
}

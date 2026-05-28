import type Redis from 'ioredis';
import { calculatePercentiles } from '@api-perf/shared';
import { REDIS_CHANNELS } from '@api-perf/shared';
import type { MetricsWindow, RequestLogEntry } from '@api-perf/shared';
import type { RunWindow, UrlStat } from '@api-perf/shared';
import type { RequestResult } from './request.executor';

export class MetricsCollector {
  private windowLatencies: number[] = [];
  private windowTtfbs: number[] = [];
  private windowResponseSizes: number[] = [];
  private windowSuccess = 0;
  private windowFailure = 0;
  private windowStartMs = Date.now();

  private allLatencies: number[] = [];
  private allStatusCodes: number[] = [];
  private allErrors: string[] = [];
  private allLogs: RequestLogEntry[] = [];
  private urlStats: Record<string, UrlStat> = {};
  private allWindows: RunWindow[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  private lastCpuSample = process.cpuUsage();

  private static readonly MAX_LOGS = 1000;
  private static readonly MAX_ERROR_SAMPLES = 5;

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

    if (result.ttfbMs != null) this.windowTtfbs.push(result.ttfbMs);
    if (result.responseSizeBytes > 0) this.windowResponseSizes.push(result.responseSizeBytes);

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
        ttfbMs: result.ttfbMs,
        responseSizeBytes: result.responseSizeBytes,
        errorBody: result.errorBody,
        cacheStatus: result.cacheStatus,
      });
    }

    const key = `${result.method}:${result.url}`;
    if (!this.urlStats[key]) {
      this.urlStats[key] = {
        success: 0, failure: 0, latencies: [],
        ttfbs: [], responseSizes: [],
        cacheHits: 0, cacheMisses: 0,
        errorSamples: [],
        serverHeader: result.serverHeader,
      };
    }
    const stat = this.urlStats[key]!;
    stat.latencies.push(result.latencyMs);
    if (result.ttfbMs != null) stat.ttfbs.push(result.ttfbMs);
    if (result.responseSizeBytes > 0) stat.responseSizes.push(result.responseSizeBytes);
    if (result.cacheStatus === 'hit') stat.cacheHits++;
    else if (result.cacheStatus === 'miss') stat.cacheMisses++;
    if (!stat.serverHeader && result.serverHeader) stat.serverHeader = result.serverHeader;

    if (success) {
      stat.success++;
    } else {
      stat.failure++;
      if (result.errorBody && stat.errorSamples.length < MetricsCollector.MAX_ERROR_SAMPLES) {
        const trimmed = result.errorBody.trim();
        if (trimmed && !stat.errorSamples.includes(trimmed)) {
          stat.errorSamples.push(trimmed);
        }
      }
    }
  }

  private async emitWindow(): Promise<void> {
    if (this.windowLatencies.length === 0) return;

    const now = Date.now();
    const durationMs = now - this.windowStartMs;
    const percentiles = calculatePercentiles(this.windowLatencies);

    // CPU & memory snapshot
    const cpuDelta = process.cpuUsage(this.lastCpuSample);
    this.lastCpuSample = process.cpuUsage();
    const cpuPercent = this.emitIntervalMs > 0
      ? ((cpuDelta.user + cpuDelta.system) / 1000 / this.emitIntervalMs) * 100
      : 0;
    const memoryMb = process.memoryUsage().heapUsed / (1024 * 1024);

    const avgTtfbMs = this.windowTtfbs.length > 0
      ? this.windowTtfbs.reduce((s, v) => s + v, 0) / this.windowTtfbs.length
      : undefined;
    const p95TtfbMs = this.windowTtfbs.length > 0
      ? calculatePercentiles(this.windowTtfbs).p95
      : undefined;
    const avgResponseBytes = this.windowResponseSizes.length > 0
      ? this.windowResponseSizes.reduce((s, v) => s + v, 0) / this.windowResponseSizes.length
      : undefined;

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

    this.allWindows.push({
      t: this.windowStartMs,
      rps: window.rps,
      p50: window.p50,
      p95: window.p95,
      p99: window.p99,
      errorRate: window.requestsInWindow > 0 ? window.failureInWindow / window.requestsInWindow : 0,
      avgTtfbMs,
      p95TtfbMs,
      avgResponseBytes,
      cpuPercent: Math.min(cpuPercent, 100),
      memoryMb,
    });

    const channel = REDIS_CHANNELS.METRICS_WINDOW(this.runId);
    await this.redis.publish(
      channel,
      JSON.stringify({ type: 'METRICS_WINDOW', payload: window, timestamp: now }),
    );

    this.windowLatencies = [];
    this.windowTtfbs = [];
    this.windowResponseSizes = [];
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

  getLatencies(): number[]    { return this.allLatencies; }
  getStatusCodes(): number[]  { return this.allStatusCodes; }
  getErrors(): string[]       { return this.allErrors; }
  getLogs(): RequestLogEntry[] { return this.allLogs; }
  getUrlStats(): Record<string, UrlStat> { return this.urlStats; }
  getWindows(): RunWindow[]   { return this.allWindows; }
}

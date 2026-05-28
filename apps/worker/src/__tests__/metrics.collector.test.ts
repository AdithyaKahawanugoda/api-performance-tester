import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsCollector } from '../processor/metrics.collector';
import type { Redis } from 'ioredis';
import type { RequestResult } from '../processor/request.executor';

const makeRedis = () =>
  ({
    publish: vi.fn().mockResolvedValue(0),
    quit: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Redis;

function r(statusCode: number, latencyMs: number, extra: Partial<RequestResult> = {}): RequestResult {
  return {
    statusCode, latencyMs,
    url: 'http://a.com', method: 'GET',
    responseSizeBytes: 0, cacheStatus: 'unknown',
    ...extra,
  };
}

describe('MetricsCollector', () => {
  let redis: Redis;
  let collector: MetricsCollector;

  beforeEach(() => {
    vi.useFakeTimers();
    redis = makeRedis();
    collector = new MetricsCollector('run-abc', 0, redis, 100);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records latency for each request', () => {
    collector.record(r(200, 42));
    collector.record(r(200, 88));

    expect(collector.getLatencies()).toEqual([42, 88]);
  });

  it('records status codes', () => {
    collector.record(r(200, 10));
    collector.record(r(404, 20));
    collector.record(r(500, 30));

    expect(collector.getStatusCodes()).toEqual([200, 404, 500]);
  });

  it('records error messages for failed requests', () => {
    collector.record(r(0, 5, { error: 'ECONNREFUSED' }));

    expect(collector.getErrors()).toContain('ECONNREFUSED');
  });

  it('does not record error for successful requests', () => {
    collector.record(r(200, 10));

    expect(collector.getErrors()).toHaveLength(0);
  });

  it('does not record error for 4xx responses without error string', () => {
    collector.record(r(404, 10));

    expect(collector.getErrors()).toHaveLength(0);
  });

  it('tracks per-URL stats grouped by method:url', () => {
    collector.record(r(200, 50));
    collector.record(r(200, 80));
    collector.record(r(500, 120));
    collector.record({ ...r(201, 60), method: 'POST' });

    const stats = collector.getUrlStats();
    expect(stats['GET:http://a.com']?.success).toBe(2);
    expect(stats['GET:http://a.com']?.failure).toBe(1);
    expect(stats['GET:http://a.com']?.latencies).toHaveLength(3);
    expect(stats['POST:http://a.com']?.success).toBe(1);
    expect(stats['POST:http://a.com']?.failure).toBe(0);
  });

  it('caps request logs at 1000 entries', () => {
    for (let i = 0; i < 1100; i++) {
      collector.record(r(200, i));
    }
    expect(collector.getLogs()).toHaveLength(1000);
  });

  it('emits a metrics window to Redis on the interval', async () => {
    collector.record(r(200, 55));

    vi.advanceTimersByTime(150);
    await Promise.resolve();

    expect(redis.publish).toHaveBeenCalled();
    const [channel, payload] = (redis.publish as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    expect(channel).toContain('run-abc');
    const parsed = JSON.parse(payload) as { type: string; payload: { requestsInWindow: number } };
    expect(parsed.type).toBe('METRICS_WINDOW');
    expect(parsed.payload.requestsInWindow).toBe(1);
  });

  it('does not emit when no requests were recorded in the window', async () => {
    vi.advanceTimersByTime(150);
    await Promise.resolve();

    expect(redis.publish).not.toHaveBeenCalled();
  });

  it('flush emits remaining data and stops the interval', async () => {
    collector.record(r(200, 30));

    await collector.flush();

    expect(redis.publish).toHaveBeenCalledTimes(1);

    (redis.publish as ReturnType<typeof vi.fn>).mockClear();
    vi.advanceTimersByTime(500);
    await Promise.resolve();

    expect(redis.publish).not.toHaveBeenCalled();
  });

  it('window RPS is positive when requests were recorded', async () => {
    collector.record(r(200, 30));
    collector.record(r(200, 40));

    vi.advanceTimersByTime(50);
    await collector.flush();

    const [, payload] = (redis.publish as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    const parsed = JSON.parse(payload) as { payload: { rps: number; successInWindow: number; failureInWindow: number } };
    expect(parsed.payload.rps).toBeGreaterThan(0);
    expect(parsed.payload.successInWindow).toBe(2);
    expect(parsed.payload.failureInWindow).toBe(0);
  });
});

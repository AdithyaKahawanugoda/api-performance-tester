import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MetricsCollector } from '../processor/metrics.collector';
import type { Redis } from 'ioredis';

const makeRedis = () =>
  ({
    publish: vi.fn().mockResolvedValue(0),
    quit: vi.fn().mockResolvedValue(undefined),
  }) as unknown as Redis;

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
    collector.record({ statusCode: 200, latencyMs: 42, url: 'http://a.com', method: 'GET' });
    collector.record({ statusCode: 200, latencyMs: 88, url: 'http://a.com', method: 'GET' });

    expect(collector.getLatencies()).toEqual([42, 88]);
  });

  it('records status codes', () => {
    collector.record({ statusCode: 200, latencyMs: 10, url: 'http://a.com', method: 'GET' });
    collector.record({ statusCode: 404, latencyMs: 20, url: 'http://a.com', method: 'GET' });
    collector.record({ statusCode: 500, latencyMs: 30, url: 'http://a.com', method: 'GET' });

    expect(collector.getStatusCodes()).toEqual([200, 404, 500]);
  });

  it('records error messages for failed requests', () => {
    collector.record({ statusCode: 0, latencyMs: 5, url: 'http://a.com', method: 'GET', error: 'ECONNREFUSED' });

    expect(collector.getErrors()).toContain('ECONNREFUSED');
  });

  it('does not record error for successful requests', () => {
    collector.record({ statusCode: 200, latencyMs: 10, url: 'http://a.com', method: 'GET' });

    expect(collector.getErrors()).toHaveLength(0);
  });

  it('does not record error for 4xx responses without error string', () => {
    collector.record({ statusCode: 404, latencyMs: 10, url: 'http://a.com', method: 'GET' });

    expect(collector.getErrors()).toHaveLength(0);
  });

  it('tracks per-URL stats grouped by method:url', () => {
    collector.record({ statusCode: 200, latencyMs: 50, url: 'http://a.com', method: 'GET' });
    collector.record({ statusCode: 200, latencyMs: 80, url: 'http://a.com', method: 'GET' });
    collector.record({ statusCode: 500, latencyMs: 120, url: 'http://a.com', method: 'GET' });
    collector.record({ statusCode: 201, latencyMs: 60, url: 'http://a.com', method: 'POST' });

    const stats = collector.getUrlStats();
    expect(stats['GET:http://a.com']?.success).toBe(2);
    expect(stats['GET:http://a.com']?.failure).toBe(1);
    expect(stats['GET:http://a.com']?.latencies).toHaveLength(3);
    expect(stats['POST:http://a.com']?.success).toBe(1);
    expect(stats['POST:http://a.com']?.failure).toBe(0);
  });

  it('caps request logs at 1000 entries', () => {
    for (let i = 0; i < 1100; i++) {
      collector.record({ statusCode: 200, latencyMs: i, url: 'http://a.com', method: 'GET' });
    }
    expect(collector.getLogs()).toHaveLength(1000);
  });

  it('emits a metrics window to Redis on the interval', async () => {
    collector.record({ statusCode: 200, latencyMs: 55, url: 'http://a.com', method: 'GET' });

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
    collector.record({ statusCode: 200, latencyMs: 30, url: 'http://a.com', method: 'GET' });

    await collector.flush();

    expect(redis.publish).toHaveBeenCalledTimes(1);

    (redis.publish as ReturnType<typeof vi.fn>).mockClear();
    vi.advanceTimersByTime(500);
    await Promise.resolve();

    expect(redis.publish).not.toHaveBeenCalled();
  });

  it('window RPS is positive when requests were recorded', async () => {
    collector.record({ statusCode: 200, latencyMs: 30, url: 'http://a.com', method: 'GET' });
    collector.record({ statusCode: 200, latencyMs: 40, url: 'http://a.com', method: 'GET' });

    vi.advanceTimersByTime(50); // ensure windowEndMs > windowStartMs so RPS > 0
    await collector.flush();

    const [, payload] = (redis.publish as ReturnType<typeof vi.fn>).mock.calls[0] as [string, string];
    const parsed = JSON.parse(payload) as { payload: { rps: number; successInWindow: number; failureInWindow: number } };
    expect(parsed.payload.rps).toBeGreaterThan(0);
    expect(parsed.payload.successInWindow).toBe(2);
    expect(parsed.payload.failureInWindow).toBe(0);
  });
});

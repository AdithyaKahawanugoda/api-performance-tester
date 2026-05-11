import type { TestEndpoint } from '@api-perf/shared';

export interface RequestResult {
  statusCode: number;
  latencyMs: number;
  error?: string;
  url: string;
  method: string;
}

export async function executeRequest(
  endpoint: TestEndpoint,
  timeoutMs: number,
  retriesLeft: number,
): Promise<RequestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const start = performance.now();

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpoint.headers,
    };

    const response = await fetch(endpoint.url, {
      method: endpoint.method,
      headers,
      body: endpoint.body != null ? JSON.stringify(endpoint.body) : undefined,
      signal: controller.signal,
    });

    const latencyMs = performance.now() - start;
    return { statusCode: response.status, latencyMs, url: endpoint.url, method: endpoint.method };
  } catch (err) {
    const latencyMs = performance.now() - start;
    const error = (err as Error).message;

    if (retriesLeft > 0 && !(err instanceof DOMException && err.name === 'AbortError')) {
      return executeRequest(endpoint, timeoutMs, retriesLeft - 1);
    }

    return { statusCode: 0, latencyMs, error, url: endpoint.url, method: endpoint.method };
  } finally {
    clearTimeout(timer);
  }
}

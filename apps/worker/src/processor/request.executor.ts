import { request as undiciRequest } from 'undici';
import type { TestEndpoint } from '@api-perf/shared';

export interface RequestResult {
  statusCode: number;
  latencyMs: number;
  ttfbMs?: number;
  connectMs?: number;
  dnsMs?: number;
  tlsMs?: number;
  responseSizeBytes: number;
  errorBody?: string;
  cacheStatus: 'hit' | 'miss' | 'unknown';
  serverHeader?: string;
  error?: string;
  url: string;
  method: string;
}

function parseCacheStatus(headers: Record<string, string | string[] | undefined>): 'hit' | 'miss' | 'unknown' {
  const xCache = String(headers['x-cache'] ?? headers['cf-cache-status'] ?? headers['x-cache-status'] ?? '').toLowerCase();
  if (xCache.includes('hit')) return 'hit';
  if (xCache.includes('miss')) return 'miss';
  return 'unknown';
}

async function drainBody(body: AsyncIterable<Buffer>): Promise<{ bytes: number; text?: string }> {
  let bytes = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    bytes += chunk.length;
    if (bytes <= 512) chunks.push(chunk);
  }
  return { bytes, text: chunks.length > 0 ? Buffer.concat(chunks).toString('utf8', 0, 500) : undefined };
}

export async function executeRequest(
  endpoint: TestEndpoint,
  timeoutMs: number,
  retriesLeft: number,
  captureResponseSize = false,
): Promise<RequestResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...endpoint.headers,
    };

    const bodyStr = endpoint.body != null ? JSON.stringify(endpoint.body) : undefined;

    const res = await undiciRequest(endpoint.url, {
      method: endpoint.method,
      headers,
      body: bodyStr,
      signal: controller.signal,
      bodyTimeout: timeoutMs,
      headersTimeout: timeoutMs,
    });

    const { statusCode, headers: resHeaders, body } = res;
    // undici populates timings at runtime; TypeScript types may lag behind
    const t = ((res as unknown as Record<string, unknown>).timings ?? {}) as Record<string, number>;
    const ttfbMs = t.headers != null && t.start != null ? Math.max(0, t.headers - t.start) : undefined;
    const dnsMs  = t.socket  != null && t.start   != null ? Math.max(0, t.socket  - t.start)   : undefined;
    const connectMs = t.connect != null && t.socket != null ? Math.max(0, t.connect - t.socket) : undefined;
    const tlsMs  = t.tls    != null && t.connect != null ? Math.max(0, t.tls    - t.connect) : undefined;

    const latencyMs = ttfbMs ?? (t.done != null && t.start != null ? t.done - t.start : 0);

    const isError = statusCode >= 400;
    const contentLengthRaw = resHeaders['content-length'];
    const contentLength = contentLengthRaw ? parseInt(String(contentLengthRaw), 10) : NaN;
    const needsDrain = isError || (captureResponseSize && isNaN(contentLength));

    let responseSizeBytes = isNaN(contentLength) ? 0 : contentLength;
    let errorBody: string | undefined;

    if (needsDrain) {
      const drained = await drainBody(body as AsyncIterable<Buffer>);
      responseSizeBytes = drained.bytes;
      if (isError) errorBody = drained.text;
    } else {
      // Always consume the body to free the socket
      for await (const _ of body) { /* noop */ }
      if (!isNaN(contentLength)) responseSizeBytes = contentLength;
    }

    return {
      statusCode,
      latencyMs,
      ttfbMs,
      connectMs,
      dnsMs,
      tlsMs,
      responseSizeBytes,
      errorBody,
      cacheStatus: parseCacheStatus(resHeaders as Record<string, string | string[] | undefined>),
      serverHeader: resHeaders['server'] ? String(resHeaders['server']) : undefined,
      url: endpoint.url,
      method: endpoint.method,
    };
  } catch (err) {
    const error = (err as Error).message;

    if (retriesLeft > 0 && !(err instanceof DOMException && err.name === 'AbortError')) {
      return executeRequest(endpoint, timeoutMs, retriesLeft - 1, captureResponseSize);
    }

    return {
      statusCode: 0,
      latencyMs: timeoutMs,
      responseSizeBytes: 0,
      cacheStatus: 'unknown',
      error,
      url: endpoint.url,
      method: endpoint.method,
    };
  } finally {
    clearTimeout(timer);
  }
}

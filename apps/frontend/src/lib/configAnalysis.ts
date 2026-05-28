import type { TestEndpoint } from '@api-perf/shared';
import { formatBytes } from './formatters';

export function detectAuthType(headers?: Record<string, string>): string {
  if (!headers) return 'None';
  const entries = Object.entries(headers);
  const authValue = entries.find(([k]) => k.toLowerCase() === 'authorization')?.[1];
  if (authValue?.toLowerCase().startsWith('bearer ')) return 'Bearer Token';
  if (authValue?.toLowerCase().startsWith('basic ')) return 'Basic Auth';
  if (authValue?.toLowerCase().startsWith('digest ')) return 'Digest Auth';
  if (entries.some(([k]) => /^(x-api-key|api-key|x-auth-token|apikey)$/i.test(k))) return 'API Key';
  return 'None';
}

export function getPayloadSize(body: unknown): number {
  if (body == null) return 0;
  return new TextEncoder().encode(JSON.stringify(body)).length;
}

export function getPayloadSizeLabel(body: unknown): string {
  const bytes = getPayloadSize(body);
  return bytes === 0 ? 'None' : formatBytes(bytes);
}

export function extractQueryParams(url: string): string[] {
  try {
    const u = new URL(url);
    return Array.from(u.searchParams.keys());
  } catch {
    return [];
  }
}

export interface EndpointWeight {
  label: string;
  weight: number;
  percent: number;
}

export function getEndpointWeights(endpoints: TestEndpoint[]): EndpointWeight[] {
  const total = endpoints.reduce((s, e) => s + (e.weight ?? 1), 0);
  return endpoints.map((e) => ({
    label: `${e.method} ${e.url.length > 40 ? e.url.slice(0, 39) + '…' : e.url}`,
    weight: e.weight ?? 1,
    percent: total > 0 ? ((e.weight ?? 1) / total) * 100 : 0,
  }));
}

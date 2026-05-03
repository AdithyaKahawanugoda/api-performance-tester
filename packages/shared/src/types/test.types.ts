export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type TestStatus = 'idle' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface TestEndpoint {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  weight?: number;
}

export interface TestConfig {
  id: string;
  name: string;
  description?: string;
  endpoints: TestEndpoint[];
  concurrency: number;
  totalRequests: number;
  durationSeconds?: number;
  rampUpSeconds?: number;
  timeout: number;
  retries: number;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EndpointStats {
  url: string;
  method: HttpMethod;
  successCount: number;
  failureCount: number;
  avgLatency: number;
  p99: number;
}

export interface AggregatedMetrics {
  totalRequests: number;
  successCount: number;
  failureCount: number;
  rps: number;
  peakRps: number;
  minLatency: number;
  maxLatency: number;
  avgLatency: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  bytesReceived: number;
  durationMs: number;
  statusCodeDistribution: Record<string, number>;
  endpointStats: EndpointStats[];
}

export interface TestRun {
  id: string;
  configId: string;
  config: TestConfig;
  status: TestStatus;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  metrics?: AggregatedMetrics;
  jobIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}


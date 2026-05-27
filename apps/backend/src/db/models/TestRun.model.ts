import { Schema, model, Document, Model, Types } from 'mongoose';
import type { TestStatus, AggregatedMetrics, EndpointStats, TestConfig } from '@api-perf/shared';

export interface ITestRun extends Document {
  configId: Types.ObjectId;
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

const TEST_STATUSES: TestStatus[] = ['idle', 'queued', 'running', 'completed', 'failed', 'cancelled'];

const EndpointStatsSchema = new Schema<EndpointStats>(
  {
    url: String,
    method: String,
    successCount: Number,
    failureCount: Number,
    avgLatency: Number,
    p99: Number,
  },
  { _id: false },
);

const MetricsSchema = new Schema<AggregatedMetrics>(
  {
    totalRequests: Number,
    successCount: Number,
    failureCount: Number,
    rps: Number,
    peakRps: Number,
    minLatency: Number,
    maxLatency: Number,
    avgLatency: Number,
    p50: Number,
    p95: Number,
    p99: Number,
    errorRate: Number,
    bytesReceived: Number,
    durationMs: Number,
    statusCodeDistribution: { type: Map, of: Number },
    endpointStats: [EndpointStatsSchema],
    windows: [{
      _id: false,
      t: Number,
      rps: Number,
      p50: Number,
      p95: Number,
      p99: Number,
      errorRate: Number,
    }],
  },
  { _id: false },
);

const TestRunSchema = new Schema<ITestRun>(
  {
    configId: { type: Schema.Types.ObjectId, ref: 'TestConfig', required: true, index: true },
    config: { type: Schema.Types.Mixed, required: true },
    status: { type: String, enum: TEST_STATUSES, default: 'queued', index: true },
    startedAt: Date,
    completedAt: Date,
    error: String,
    metrics: MetricsSchema,
    jobIds: [{ type: String }],
  },
  { timestamps: true },
);

TestRunSchema.index({ createdAt: -1 });
TestRunSchema.index({ configId: 1, createdAt: -1 });

export const TestRunModel: Model<ITestRun> = model<ITestRun>('TestRun', TestRunSchema);

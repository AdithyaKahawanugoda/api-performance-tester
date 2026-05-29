import { Schema, model, Document, Model } from 'mongoose';
import type { TestConfig, TestEndpoint, HttpMethod } from '@api-perf/shared';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export interface ITestConfig extends Omit<TestConfig, 'id'>, Document {}

const EndpointSchema = new Schema<TestEndpoint>(
  {
    method: { type: String, enum: HTTP_METHODS, required: true },
    url: { type: String, required: true },
    headers: { type: Map, of: String, default: {} },
    body: { type: Schema.Types.Mixed },
    weight: { type: Number, default: 1, min: 1 },
  },
  { _id: false },
);

const TestConfigSchema = new Schema<ITestConfig>(
  {
    name: { type: String, required: true, index: true, maxlength: 100 },
    description: { type: String, maxlength: 500 },
    endpoints: { type: [EndpointSchema], required: true, validate: [(v: unknown[]) => v.length > 0, 'At least one endpoint required'] },
    concurrency: { type: Number, required: true, min: 1, max: 500 },
    totalRequests: { type: Number, required: true, min: 1 },
    rampUpSeconds: { type: Number, default: 0, min: 0 },
    timeout: { type: Number, required: true, default: 5000 },
    retries: { type: Number, default: 0, min: 0, max: 5 },
    captureResponseSize: { type: Boolean, default: false },
    tags: [{ type: String }],
  },
  { timestamps: true },
);

export const TestConfigModel: Model<ITestConfig> = model<ITestConfig>('TestConfig', TestConfigSchema);

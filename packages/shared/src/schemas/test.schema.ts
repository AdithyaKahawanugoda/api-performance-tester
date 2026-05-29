import { z } from 'zod';
import { DEFAULT_CONCURRENCY, DEFAULT_TIMEOUT, DEFAULT_RETRIES } from '../constants/defaults.constants';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;

export const TestEndpointSchema = z.object({
  method: z.enum(HTTP_METHODS),
  url: z.string().url('Must be a valid URL'),
  headers: z.record(z.string()).optional(),
  body: z.unknown().optional(),
  weight: z.number().int().positive().optional().default(1),
});

export const CreateTestConfigSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  endpoints: z.array(TestEndpointSchema).min(1, 'At least one endpoint required').max(20),
  concurrency: z.number().int().min(1).max(500).default(DEFAULT_CONCURRENCY),
  totalRequests: z.number().int().min(1).max(1_000_000),
  rampUpSeconds: z.number().int().min(0).optional().default(0),
  timeout: z.number().int().min(100).max(30_000).default(DEFAULT_TIMEOUT),
  retries: z.number().int().min(0).max(5).default(DEFAULT_RETRIES),
  tags: z.array(z.string()).optional(),
  captureResponseSize: z.boolean().optional(),
});

export const UpdateTestConfigSchema = CreateTestConfigSchema.partial();

export const StartTestRunSchema = z.object({
  configId: z.string().min(1),
});

export type CreateTestConfigInput = z.infer<typeof CreateTestConfigSchema>;
export type UpdateTestConfigInput = z.infer<typeof UpdateTestConfigSchema>;
export type StartTestRunInput = z.infer<typeof StartTestRunSchema>;

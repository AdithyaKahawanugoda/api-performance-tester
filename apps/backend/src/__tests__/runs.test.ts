import { describe, it, expect, vi } from 'vitest';
import supertest from 'supertest';

vi.mock('ioredis', () => ({
  default: vi.fn().mockImplementation(() => ({
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    quit: vi.fn().mockResolvedValue(undefined),
    set: vi.fn().mockResolvedValue('OK'),
    get: vi.fn().mockResolvedValue(null),
    exists: vi.fn().mockResolvedValue(0),
    publish: vi.fn().mockResolvedValue(0),
    psubscribe: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('bullmq', () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: 'mock-job-id' }),
    getJob: vi.fn().mockResolvedValue(null),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  QueueEvents: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

import { createApp } from '../app';

const app = createApp();
const request = supertest(app);

const validConfig = {
  name: 'Run Test Config',
  endpoints: [{ method: 'GET', url: 'http://httpbin.org/get' }],
  totalRequests: 50,
  concurrency: 2,
};

describe('GET /api/runs', () => {
  it('returns an empty list when no runs exist', async () => {
    const res = await request.get('/api/runs');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
  });
});

describe('GET /api/runs/compare', () => {
  it('returns 400 when ids param is missing', async () => {
    const res = await request.get('/api/runs/compare');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 when fewer than 2 ids are provided', async () => {
    const res = await request.get('/api/runs/compare?ids=abc');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('returns 400 when more than 4 ids are provided', async () => {
    const res = await request.get('/api/runs/compare?ids=a,b,c,d,e');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });
});

describe('POST /api/runs', () => {
  it('returns 400 when body is missing configId', async () => {
    const res = await request.post('/api/runs').send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 404 when configId does not exist', async () => {
    const res = await request
      .post('/api/runs')
      .send({ configId: '000000000000000000000001' });

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('creates a run for a valid configId and returns 201', async () => {
    const cfg = await request.post('/api/configs').send(validConfig);
    const configId = cfg.body.data.id as string;

    const res = await request.post('/api/runs').send({ configId });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.configId).toBe(configId);
    expect(['queued', 'running']).toContain(res.body.data.status);
  });

  it('lists the created run in GET /api/runs', async () => {
    const cfg = await request.post('/api/configs').send(validConfig);
    const configId = cfg.body.data.id as string;

    await request.post('/api/runs').send({ configId });

    const res = await request.get('/api/runs');
    expect(res.body.data.total).toBeGreaterThanOrEqual(1);
  });
});

describe('POST /api/runs/:id/cancel', () => {
  it('returns 404 for a non-existent run id', async () => {
    const res = await request.post('/api/runs/000000000000000000000001/cancel');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('cancels a running run and sets status to cancelled', async () => {
    const cfg = await request.post('/api/configs').send(validConfig);
    const configId = cfg.body.data.id as string;

    const run = await request.post('/api/runs').send({ configId });
    const runId = run.body.data.id as string;

    const res = await request.post(`/api/runs/${runId}/cancel`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('cancelled');
  });
});

describe('GET /api/runs/:id', () => {
  it('returns 404 for a non-existent run', async () => {
    const res = await request.get('/api/runs/000000000000000000000001');

    expect(res.status).toBe(404);
  });

  it('returns the run by id', async () => {
    const cfg = await request.post('/api/configs').send(validConfig);
    const run = await request.post('/api/runs').send({ configId: cfg.body.data.id });
    const runId = run.body.data.id as string;

    const res = await request.get(`/api/runs/${runId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(runId);
  });
});

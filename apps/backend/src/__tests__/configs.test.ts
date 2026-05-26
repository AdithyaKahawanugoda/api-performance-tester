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
  name: 'My Load Test',
  endpoints: [{ method: 'GET', url: 'http://httpbin.org/get' }],
  totalRequests: 100,
  concurrency: 5,
};

describe('POST /api/configs', () => {
  it('creates a config and returns 201 with an id', async () => {
    const res = await request.post('/api/configs').send(validConfig);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.data.id).toBe('string');
    expect(res.body.data.name).toBe('My Load Test');
  });

  it('returns 400 when name is missing', async () => {
    const res = await request.post('/api/configs').send({
      endpoints: [{ method: 'GET', url: 'http://httpbin.org/get' }],
      totalRequests: 100,
    });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when totalRequests is missing', async () => {
    const res = await request.post('/api/configs').send({
      name: 'Test',
      endpoints: [{ method: 'GET', url: 'http://httpbin.org/get' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when endpoints array is empty', async () => {
    const res = await request.post('/api/configs').send({ ...validConfig, endpoints: [] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when an endpoint URL is invalid', async () => {
    const res = await request.post('/api/configs').send({
      ...validConfig,
      endpoints: [{ method: 'GET', url: 'not-a-url' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when HTTP method is invalid', async () => {
    const res = await request.post('/api/configs').send({
      ...validConfig,
      endpoints: [{ method: 'BREW', url: 'http://httpbin.org/get' }],
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when concurrency exceeds 500', async () => {
    const res = await request.post('/api/configs').send({ ...validConfig, concurrency: 501 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when more than 20 endpoints are provided', async () => {
    const endpoints = Array.from({ length: 21 }, () => ({
      method: 'GET',
      url: 'http://httpbin.org/get',
    }));
    const res = await request.post('/api/configs').send({ ...validConfig, endpoints });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 when totalRequests exceeds 1,000,000', async () => {
    const res = await request.post('/api/configs').send({ ...validConfig, totalRequests: 1_000_001 });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/configs', () => {
  it('returns an empty list when no configs exist', async () => {
    const res = await request.get('/api/configs');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.items).toEqual([]);
    expect(res.body.data.total).toBe(0);
  });

  it('lists configs after creation', async () => {
    await request.post('/api/configs').send(validConfig);
    await request.post('/api/configs').send({ ...validConfig, name: 'Second Test' });

    const res = await request.get('/api/configs');

    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(2);
    expect(res.body.data.items).toHaveLength(2);
  });
});

describe('GET /api/configs/:id', () => {
  it('returns the config by id', async () => {
    const created = await request.post('/api/configs').send(validConfig);
    const id = created.body.data.id as string;

    const res = await request.get(`/api/configs/${id}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(id);
    expect(res.body.data.name).toBe('My Load Test');
  });

  it('returns 404 for a non-existent id', async () => {
    const res = await request.get('/api/configs/000000000000000000000001');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a malformed id', async () => {
    const res = await request.get('/api/configs/not-a-valid-id');

    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/configs/:id', () => {
  it('updates only the provided fields', async () => {
    const created = await request.post('/api/configs').send(validConfig);
    const id = created.body.data.id as string;

    const res = await request.patch(`/api/configs/${id}`).send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
    expect(res.body.data.totalRequests).toBe(100);
  });

  it('returns 404 when patching a non-existent id', async () => {
    const res = await request
      .patch('/api/configs/000000000000000000000001')
      .send({ name: 'x' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/configs/:id', () => {
  it('deletes an existing config and returns 204', async () => {
    const created = await request.post('/api/configs').send(validConfig);
    const id = created.body.data.id as string;

    const res = await request.delete(`/api/configs/${id}`);
    expect(res.status).toBe(204);

    const check = await request.get(`/api/configs/${id}`);
    expect(check.status).toBe(404);
  });

  it('returns 404 when deleting a non-existent config', async () => {
    const res = await request.delete('/api/configs/000000000000000000000001');

    expect(res.status).toBe(404);
  });
});

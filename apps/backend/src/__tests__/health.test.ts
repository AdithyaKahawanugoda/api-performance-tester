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

describe('GET /api/health', () => {
  it('returns 200 with status ok', async () => {
    const res = await request.get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(typeof res.body.data.timestamp).toBe('string');
  });
});

describe('Unknown routes', () => {
  it('returns 404 for unrecognised path', async () => {
    const res = await request.get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 404 for a completely unknown top-level path', async () => {
    const res = await request.get('/no-such-route');

    expect(res.status).toBe(404);
  });
});

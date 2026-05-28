import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock undici before importing the executor so the module picks up the mock
vi.mock('undici', () => ({
  request: vi.fn(),
}));

import { request as undiciRequest } from 'undici';
import { executeRequest } from '../processor/request.executor';

const mockRequest = vi.mocked(undiciRequest);

const endpoint = { method: 'GET' as const, url: 'http://example.com', headers: {}, weight: 1 };

function makeResponse(statusCode: number, headers: Record<string, string> = {}) {
  return {
    statusCode,
    headers: { 'content-length': '0', ...headers },
    body: (async function* () {})(),
    trailers: {},
    opaque: null,
    context: {},
  };
}

describe('executeRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status code and latency on success', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse(200) as never);

    const result = await executeRequest(endpoint, 5000, 0);

    expect(result.statusCode).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.url).toBe('http://example.com');
    expect(result.method).toBe('GET');
    expect(result.error).toBeUndefined();
  });

  it('returns statusCode 0 and error message on network failure', async () => {
    mockRequest.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await executeRequest(endpoint, 5000, 0);

    expect(result.statusCode).toBe(0);
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('retries once on network error when retriesLeft > 0', async () => {
    mockRequest
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce(makeResponse(200) as never);

    const result = await executeRequest(endpoint, 5000, 1);

    expect(mockRequest).toHaveBeenCalledTimes(2);
    expect(result.statusCode).toBe(200);
    expect(result.error).toBeUndefined();
  });

  it('exhausts all retries and returns the final error', async () => {
    mockRequest.mockRejectedValue(new Error('Persistent failure'));

    const result = await executeRequest(endpoint, 5000, 2);

    expect(mockRequest).toHaveBeenCalledTimes(3);
    expect(result.statusCode).toBe(0);
    expect(result.error).toBe('Persistent failure');
  });

  it('does not retry on AbortError (timeout)', async () => {
    mockRequest.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

    const result = await executeRequest(endpoint, 5000, 3);

    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(result.statusCode).toBe(0);
  });

  it('passes method, headers, and body to undici request', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse(201) as never);
    const postEndpoint = {
      method: 'POST' as const,
      url: 'http://api.example.com/users',
      headers: { Authorization: 'Bearer token123' },
      body: { name: 'Alice' },
      weight: 1,
    };

    await executeRequest(postEndpoint, 5000, 0);

    expect(mockRequest).toHaveBeenCalledWith(
      'http://api.example.com/users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token123' }),
        body: JSON.stringify({ name: 'Alice' }),
      }),
    );
  });

  it('sends no body for GET requests', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse(200) as never);

    await executeRequest(endpoint, 5000, 0);

    expect(mockRequest).toHaveBeenCalledWith(
      'http://example.com',
      expect.objectContaining({ body: undefined }),
    );
  });

  it('handles non-2xx status codes without treating them as errors', async () => {
    // 4xx — body will be drained for errorBody; provide an empty async iterable body
    mockRequest.mockResolvedValueOnce(makeResponse(404) as never);

    const result = await executeRequest(endpoint, 5000, 0);

    expect(result.statusCode).toBe(404);
    expect(result.error).toBeUndefined();
  });

  it('populates ttfbMs on successful response', async () => {
    mockRequest.mockResolvedValueOnce(makeResponse(200) as never);

    const result = await executeRequest(endpoint, 5000, 0);

    expect(result.ttfbMs).toBeGreaterThanOrEqual(0);
  });
});

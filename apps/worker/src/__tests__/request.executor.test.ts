import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { executeRequest } from '../processor/request.executor';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

afterAll(() => {
  vi.unstubAllGlobals();
});

const endpoint = { method: 'GET' as const, url: 'http://example.com', headers: {}, weight: 1 };

describe('executeRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status code and latency on success', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 } as Response);

    const result = await executeRequest(endpoint, 5000, 0);

    expect(result.statusCode).toBe(200);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.url).toBe('http://example.com');
    expect(result.method).toBe('GET');
    expect(result.error).toBeUndefined();
  });

  it('returns statusCode 0 and error message on network failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await executeRequest(endpoint, 5000, 0);

    expect(result.statusCode).toBe(0);
    expect(result.error).toBe('ECONNREFUSED');
  });

  it('retries once on network error when retriesLeft > 0', async () => {
    mockFetch
      .mockRejectedValueOnce(new Error('Network failure'))
      .mockResolvedValueOnce({ status: 200 } as Response);

    const result = await executeRequest(endpoint, 5000, 1);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.statusCode).toBe(200);
    expect(result.error).toBeUndefined();
  });

  it('exhausts all retries and returns the final error', async () => {
    mockFetch.mockRejectedValue(new Error('Persistent failure'));

    const result = await executeRequest(endpoint, 5000, 2);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result.statusCode).toBe(0);
    expect(result.error).toBe('Persistent failure');
  });

  it('does not retry on AbortError (timeout)', async () => {
    mockFetch.mockRejectedValueOnce(new DOMException('The operation was aborted', 'AbortError'));

    const result = await executeRequest(endpoint, 5000, 3);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(result.statusCode).toBe(0);
  });

  it('passes method, headers, and body to fetch', async () => {
    mockFetch.mockResolvedValueOnce({ status: 201 } as Response);
    const postEndpoint = {
      method: 'POST' as const,
      url: 'http://api.example.com/users',
      headers: { Authorization: 'Bearer token123' },
      body: { name: 'Alice' },
      weight: 1,
    };

    await executeRequest(postEndpoint, 5000, 0);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://api.example.com/users',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer token123' }),
        body: JSON.stringify({ name: 'Alice' }),
      }),
    );
  });

  it('sends no body for GET requests', async () => {
    mockFetch.mockResolvedValueOnce({ status: 200 } as Response);

    await executeRequest(endpoint, 5000, 0);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://example.com',
      expect.objectContaining({ body: undefined }),
    );
  });

  it('handles non-2xx status codes without treating them as errors', async () => {
    mockFetch.mockResolvedValueOnce({ status: 404 } as Response);

    const result = await executeRequest(endpoint, 5000, 0);

    expect(result.statusCode).toBe(404);
    expect(result.error).toBeUndefined();
  });
});

import { describe, it, expect } from 'vitest';
import { calculatePercentile, calculatePercentiles, average } from '../utils/percentile';

describe('calculatePercentile', () => {
  it('returns 0 for empty array', () => {
    expect(calculatePercentile([], 50)).toBe(0);
  });

  it('returns the only value for single-element array at any percentile', () => {
    expect(calculatePercentile([42], 1)).toBe(42);
    expect(calculatePercentile([42], 50)).toBe(42);
    expect(calculatePercentile([42], 99)).toBe(42);
  });

  it('returns correct p50 for a small sorted array', () => {
    expect(calculatePercentile([10, 20, 30, 40], 50)).toBe(20);
  });

  it('returns correct p99 for a 100-element array', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(calculatePercentile(arr, 99)).toBe(99);
  });

  it('returns the maximum value for p100', () => {
    expect(calculatePercentile([10, 20, 30], 100)).toBe(30);
  });

  it('returns the minimum value for p1 on a large array', () => {
    const arr = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(calculatePercentile(arr, 1)).toBe(1);
  });
});

describe('calculatePercentiles', () => {
  it('returns all zeros for empty array', () => {
    expect(calculatePercentiles([])).toEqual({ p50: 0, p95: 0, p99: 0 });
  });

  it('returns the single value for all percentiles on a one-element array', () => {
    expect(calculatePercentiles([100])).toEqual({ p50: 100, p95: 100, p99: 100 });
  });

  it('sorts input before computing percentiles', () => {
    const unsorted = [500, 100, 900, 300, 700];
    const sorted = [100, 300, 500, 700, 900];
    const result = calculatePercentiles(unsorted);
    expect(result.p50).toBe(calculatePercentile(sorted, 50));
    expect(result.p95).toBe(calculatePercentile(sorted, 95));
    expect(result.p99).toBe(calculatePercentile(sorted, 99));
  });

  it('does not mutate the input array', () => {
    const input = [300, 100, 200];
    calculatePercentiles(input);
    expect(input).toEqual([300, 100, 200]);
  });

  it('p50 <= p95 <= p99 for any distribution', () => {
    const values = [50, 1000, 200, 850, 320, 670, 430, 590, 480, 10];
    const { p50, p95, p99 } = calculatePercentiles(values);
    expect(p50).toBeLessThanOrEqual(p95);
    expect(p95).toBeLessThanOrEqual(p99);
  });

  it('handles a uniform distribution correctly', () => {
    const arr = new Array(100).fill(42);
    expect(calculatePercentiles(arr)).toEqual({ p50: 42, p95: 42, p99: 42 });
  });
});

describe('average', () => {
  it('returns 0 for empty array', () => {
    expect(average([])).toBe(0);
  });

  it('returns the value itself for a single element', () => {
    expect(average([7])).toBe(7);
  });

  it('computes correct average for integers', () => {
    expect(average([1, 2, 3, 4, 5])).toBe(3);
    expect(average([10, 20])).toBe(15);
  });

  it('handles floating point values', () => {
    expect(average([1, 2])).toBeCloseTo(1.5);
  });

  it('handles all identical values', () => {
    expect(average([5, 5, 5, 5])).toBe(5);
  });
});

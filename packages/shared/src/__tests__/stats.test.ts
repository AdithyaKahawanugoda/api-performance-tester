import { describe, it, expect } from 'vitest';
import { RunningStat } from '../utils/stats';

describe('RunningStat', () => {
  it('starts with count 0 and neutral values', () => {
    const s = new RunningStat();
    expect(s.count).toBe(0);
    expect(s.avg).toBe(0);
    expect(s.min).toBe(0);
    expect(s.max).toBe(0);
    expect(s.variance).toBe(0);
    expect(s.stddev).toBe(0);
  });

  it('tracks count correctly', () => {
    const s = new RunningStat();
    s.push(1);
    s.push(2);
    s.push(3);
    expect(s.count).toBe(3);
  });

  it('computes correct mean', () => {
    const s = new RunningStat();
    s.push(10);
    s.push(20);
    s.push(30);
    expect(s.avg).toBeCloseTo(20);
  });

  it('tracks min and max', () => {
    const s = new RunningStat();
    s.push(50);
    s.push(10);
    s.push(100);
    s.push(30);
    expect(s.min).toBe(10);
    expect(s.max).toBe(100);
  });

  it('returns the single value as both min and max for one push', () => {
    const s = new RunningStat();
    s.push(42);
    expect(s.min).toBe(42);
    expect(s.max).toBe(42);
  });

  it('variance is 0 for a single value', () => {
    const s = new RunningStat();
    s.push(42);
    expect(s.variance).toBe(0);
    expect(s.stddev).toBe(0);
  });

  it('computes correct sample variance for [1, 2, 3]', () => {
    // mean=2, deviations=[-1,0,1], sum-sq=2, sample var=2/(3-1)=1
    const s = new RunningStat();
    [1, 2, 3].forEach((v) => s.push(v));
    expect(s.avg).toBeCloseTo(2);
    expect(s.variance).toBeCloseTo(1);
    expect(s.stddev).toBeCloseTo(1);
  });

  it('stddev equals sqrt(variance) for any input', () => {
    const s = new RunningStat();
    [3, 7, 12, 1, 8].forEach((v) => s.push(v));
    expect(s.stddev).toBeCloseTo(Math.sqrt(s.variance));
  });

  it('handles negative numbers', () => {
    const s = new RunningStat();
    s.push(-10);
    s.push(0);
    s.push(10);
    expect(s.avg).toBeCloseTo(0);
    expect(s.min).toBe(-10);
    expect(s.max).toBe(10);
  });

  it('min and max update correctly as new extremes arrive', () => {
    const s = new RunningStat();
    s.push(5);
    expect(s.min).toBe(5);
    expect(s.max).toBe(5);
    s.push(1);
    expect(s.min).toBe(1);
    s.push(100);
    expect(s.max).toBe(100);
  });
});

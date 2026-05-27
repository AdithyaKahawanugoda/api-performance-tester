/* Mock data for the prototype. Realistic-ish numbers for a perf tool. */
/* global window */

const ICONS = {
  home:   '<path d="M3 11.5L10 5l7 6.5V17a1 1 0 0 1-1 1h-3v-5H8v5H4a1 1 0 0 1-1-1v-5.5Z"/>',
  cog:    '<circle cx="10" cy="10" r="2.4"/><path d="M10 2.5v2M10 15.5v2M17.5 10h-2M4.5 10h-2M15.3 4.7l-1.4 1.4M6.1 13.9l-1.4 1.4M15.3 15.3l-1.4-1.4M6.1 6.1 4.7 4.7"/>',
  run:    '<path d="M5 4 5 16 16 10 5 4Z"/>',
  cmp:    '<path d="M4 4h5v12H4zM11 7h5v9h-5z"/>',
  up:     '<path d="M10 4v10M5 9l5-5 5 5"/>',
  search: '<circle cx="9" cy="9" r="5"/><path d="m17 17-3.5-3.5"/>',
  bell:   '<path d="M5 13V9a5 5 0 0 1 10 0v4l1.5 2H3.5L5 13Z"/><path d="M8.5 17a1.5 1.5 0 0 0 3 0"/>',
  sun:    '<circle cx="10" cy="10" r="3"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.6 4.6l1.4 1.4M14 14l1.4 1.4M4.6 15.4 6 14M14 6l1.4-1.4"/>',
  download: '<path d="M10 3v9M5 8l5 5 5-5M3 17h14"/>',
  stop:   '<rect x="5" y="5" width="10" height="10" rx="1.5"/>',
  plus:   '<path d="M10 4v12M4 10h12"/>',
  arrow:  '<path d="M5 10h10M11 6l4 4-4 4"/>',
  chevron:'<path d="m7 5 5 5-5 5"/>',
  trash:  '<path d="M4 6h12M8 6V4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2M6 6l1 10a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1l1-10"/>',
  filter: '<path d="M3 5h14l-5 6v5l-4-1v-4L3 5Z"/>',
  zap:    '<path d="M11 2 4 11h5l-1 7 7-9h-5l1-7Z"/>',
  history: '<path d="M3 10a7 7 0 1 0 2-5L3 7M3 3v4h4"/>',
  globe:  '<circle cx="10" cy="10" r="7"/><path d="M3 10h14M10 3a10 10 0 0 1 0 14M10 3a10 10 0 0 0 0 14"/>',
  doc:    '<path d="M5 3h7l3 3v11H5z"/><path d="M12 3v3h3"/>',
};

function rnd(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const seeded = rnd(42);

const configs = [
  { id: 'cfg_01', name: 'Checkout API · smoke', description: 'Verify checkout flow under low concurrency before deploy.',
    endpoints: 4, concurrency: 10, totalRequests: 500, timeout: 5000, retries: 1,
    tags: ['smoke','prod-gate'], createdAt: '2 days ago', lastRun: '12m', lastP99: 142, lastRps: 48 },
  { id: 'cfg_02', name: 'Search · sustained load', description: '50 workers hammering /search for 5 minutes.',
    endpoints: 2, concurrency: 50, totalRequests: 25000, timeout: 8000, retries: 0,
    tags: ['load','search'], createdAt: '5 days ago', lastRun: '1h', lastP99: 387, lastRps: 312 },
  { id: 'cfg_03', name: 'Auth · spike test', description: 'Burst of 200 concurrent /login then drain.',
    endpoints: 1, concurrency: 200, totalRequests: 10000, timeout: 3000, retries: 0,
    tags: ['spike','auth','breaks-prod'], createdAt: '1 week ago', lastRun: '3d', lastP99: 894, lastRps: 218 },
  { id: 'cfg_04', name: 'Catalog v2 · regression', description: 'Compare catalog API against v1 baseline.',
    endpoints: 6, concurrency: 25, totalRequests: 15000, timeout: 6000, retries: 1,
    tags: ['regression','catalog'], createdAt: '1 week ago', lastRun: '6h', lastP99: 211, lastRps: 144 },
  { id: 'cfg_05', name: 'Webhooks · soak (24h)', description: 'Long-running soak; one request per second sustained.',
    endpoints: 1, concurrency: 1, totalRequests: 86400, timeout: 10000, retries: 2,
    tags: ['soak'], createdAt: '2 weeks ago', lastRun: '2d', lastP99: 78, lastRps: 1 },
  { id: 'cfg_06', name: 'GraphQL · mixed traffic', description: 'Weighted blend of queries + mutations.',
    endpoints: 8, concurrency: 40, totalRequests: 20000, timeout: 7000, retries: 0,
    tags: ['graphql','prod-like'], createdAt: '3 weeks ago', lastRun: '5d', lastP99: 268, lastRps: 187 },
];

function makeLatencySeries(n, base, noise) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const trend = base + Math.sin(t * 6.2) * noise * 0.4 + (seeded() - 0.5) * noise;
    out.push(Math.max(5, trend));
  }
  return out;
}

const runs = [
  { id: 'run_8f3a', config: 'Search · sustained load', status: 'running', startedAt: '3m ago',
    requests: 18420, avgLatency: 187, p99: 412, rps: 304, errorRate: 0.012 },
  { id: 'run_8f29', config: 'Checkout API · smoke', status: 'completed', startedAt: '12m ago',
    requests: 500, avgLatency: 64, p99: 142, rps: 48, errorRate: 0.000 },
  { id: 'run_8f21', config: 'Auth · spike test', status: 'failed', startedAt: '47m ago',
    requests: 8200, avgLatency: 421, p99: 1854, rps: 198, errorRate: 0.084 },
  { id: 'run_8f1c', config: 'Catalog v2 · regression', status: 'completed', startedAt: '1h ago',
    requests: 15000, avgLatency: 92, p99: 211, rps: 144, errorRate: 0.003 },
  { id: 'run_8f0e', config: 'GraphQL · mixed traffic', status: 'completed', startedAt: '5h ago',
    requests: 20000, avgLatency: 118, p99: 268, rps: 187, errorRate: 0.001 },
  { id: 'run_8efa', config: 'Webhooks · soak (24h)', status: 'cancelled', startedAt: '8h ago',
    requests: 28800, avgLatency: 41, p99: 78, rps: 1, errorRate: 0.000 },
  { id: 'run_8ed3', config: 'Checkout API · smoke', status: 'completed', startedAt: '1d ago',
    requests: 500, avgLatency: 59, p99: 128, rps: 47, errorRate: 0.000 },
  { id: 'run_8ec1', config: 'Search · sustained load', status: 'completed', startedAt: '2d ago',
    requests: 25000, avgLatency: 174, p99: 387, rps: 312, errorRate: 0.008 },
];

const liveEndpoints = [
  { method: 'GET',  path: '/search?q={kw}',         weight: 60, success: 9842, fail: 124, p50: 142, p99: 387, avg: 168 },
  { method: 'GET',  path: '/search/suggest',        weight: 30, success: 5410, fail: 18,  p50: 22,  p99: 84,  avg: 31  },
  { method: 'POST', path: '/search/index',          weight: 10, success: 1830, fail: 2,   p50: 88,  p99: 211, avg: 102 },
];

const completedEndpoints = [
  { method: 'GET',  path: '/api/v2/products',           success: 5982, fail: 18, p50: 78,  p99: 211, avg: 92 },
  { method: 'GET',  path: '/api/v2/products/{id}',      success: 4218, fail: 12, p50: 41,  p99: 138, avg: 54 },
  { method: 'GET',  path: '/api/v2/products/{id}/related', success: 2104, fail: 8,  p50: 112, p99: 268, avg: 134 },
  { method: 'POST', path: '/api/v2/products/search',    success: 1487, fail: 6,  p50: 156, p99: 312, avg: 178 },
  { method: 'GET',  path: '/api/v2/categories',         success: 814,  fail: 2,  p50: 24,  p99: 58,  avg: 32 },
  { method: 'POST', path: '/api/v2/cart/preview',       success: 348,  fail: 0,  p50: 38,  p99: 92,  avg: 47 },
];

const statusCodes = [
  { code: '200', count: 14842, color: 'var(--ok)' },
  { code: '201', count: 1487,  color: 'oklch(0.78 0.13 175)' },
  { code: '304', count: 92,    color: 'oklch(0.78 0.14 230)' },
  { code: '404', count: 24,    color: 'var(--warn)' },
  { code: '500', count: 12,    color: 'var(--err)' },
  { code: '503', count: 6,     color: 'oklch(0.62 0.20 25)' },
];

const compareRuns = [
  { id: 'run_8ec1', label: 'Baseline', date: '2 days ago',
    requests: 25000, avgLatency: 174, p50: 142, p95: 312, p99: 387, rps: 312, errorRate: 0.008 },
  { id: 'run_8f0e', label: 'Cache warmup', date: '5 hours ago',
    requests: 25000, avgLatency: 118, p50: 92, p95: 218, p99: 268, rps: 421, errorRate: 0.001 },
  { id: 'run_8f3a', label: 'Cache + pool tuning', date: '3 minutes ago',
    requests: 18420, avgLatency: 94, p50: 71, p95: 184, p99: 232, rps: 478, errorRate: 0.002 },
];

// Sparkline series for KPIs on dashboard
function spark(n, lo, hi, seed) {
  const r = rnd(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(lo + (hi - lo) * (0.4 + 0.5 * Math.sin(t * 5 + seed) + (r() - 0.5) * 0.3));
  }
  return out;
}

window.AppData = {
  ICONS,
  configs,
  runs,
  liveEndpoints,
  completedEndpoints,
  statusCodes,
  compareRuns,
  sparks: {
    runs:     spark(24, 8, 14, 1),
    latency:  spark(24, 80, 220, 2),
    rps:      spark(24, 120, 380, 3),
    success:  spark(24, 0.992, 0.999, 4),
  },
  makeLatencySeries,
};
